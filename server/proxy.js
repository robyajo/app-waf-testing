import http from "node:http";
import https from "node:https";
import { isIP } from "node:net";
import { randomPublicIp } from "../src/lib/ip.js";

/**
 * Proxy pengujian WAF (sisi server).
 *
 * Endpoint: POST /api/proxy
 * Body JSON: { target, path, ip, method, user_agent, payload }
 *
 * Mengirim permintaan HTTP ke URL target dengan header IP virtual
 * (`CF-Connecting-IP`, `True-Client-IP`, `X-Real-IP`, `X-Forwarded-For`)
 * sehingga seolah-olah permintaan datang dari alamat IP tersebut.
 *
 * Catatan: permintaan dikirim memakai `node:http`/`node:https` langsung agar
 * path mentah (mis. `../../etc/passwd`) terkirim apa adanya dan tidak
 * dinormalisasi seperti pada `fetch`/`URL`.
 *
 * HANYA UNTUK PENGUJIAN LOKAL.
 */

const TIMEOUT_MS = 15_000;
const DISPLAY_LIMIT = 200_000; // batas byte body yang dikirim ke browser
const RAW_LIMIT = 2_000_000; // batas byte body yang ditampung di memori
const REQUEST_BODY_LIMIT = 5_000_000;
const ALLOWED_METHODS = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
];
const BODY_METHODS = ["POST", "PUT", "PATCH", "DELETE"];

const STATUS_TEXT = {
  200: "OK",
  201: "Created",
  204: "No Content",
  301: "Moved Permanently",
  302: "Found",
  304: "Not Modified",
  400: "Bad Request",
  401: "Unauthorized",
  403: "Forbidden (diblokir)",
  404: "Not Found",
  405: "Method Not Allowed",
  419: "Page Expired (CSRF)",
  422: "Unprocessable Content",
  429: "Too Many Requests",
  500: "Server Error",
  502: "Bad Gateway",
  503: "Service Unavailable",
};

export function statusText(status) {
  return STATUS_TEXT[status] ?? `HTTP ${status}`;
}

function sendJson(res, httpStatus, data) {
  res.statusCode = httpStatus;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(data));
}

async function readJson(req) {
  const chunks = [];
  let size = 0;

  for await (const chunk of req) {
    size += chunk.length;

    if (size > REQUEST_BODY_LIMIT) {
      throw new Error("Body request terlalu besar.");
    }

    chunks.push(chunk);
  }

  const raw = Buffer.concat(chunks).toString("utf8").trim();

  return raw === "" ? {} : JSON.parse(raw);
}

function formatRawHeaders(rawHeaders) {
  const lines = [];

  for (let i = 0; i < rawHeaders.length; i += 2) {
    lines.push(`${rawHeaders[i]}: ${rawHeaders[i + 1]}`);
  }

  return lines.join("\n");
}

function performRequest(options) {
  return new Promise((resolve, reject) => {
    const transport = options.protocol === "https:" ? https : http;

    const request = transport.request(
      {
        protocol: options.protocol,
        hostname: options.hostname,
        port: options.port,
        path: options.path,
        method: options.method,
        headers: options.headers,
      },
      (response) => {
        const chunks = [];
        let received = 0;

        response.on("data", (chunk) => {
          received += chunk.length;

          if (received <= RAW_LIMIT) {
            chunks.push(chunk);
          }
        });

        response.on("end", () => {
          resolve({
            status: response.statusCode ?? 0,
            rawHeaders: response.rawHeaders,
            contentType: response.headers["content-type"] ?? "",
            body: Buffer.concat(chunks).toString("utf8"),
          });
        });
      },
    );

    request.on("error", reject);
    request.setTimeout(TIMEOUT_MS, () => {
      request.destroy(new Error(`Timeout setelah ${TIMEOUT_MS} ms`));
    });

    if (options.body) {
      request.write(options.body);
    }

    request.end();
  });
}

function parseTarget(target) {
  try {
    const parsed = new URL(target);

    if (!["http:", "https:"].includes(parsed.protocol)) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

async function handleProxyRequest(req, res) {
  if (req.method !== "POST") {
    sendJson(res, 405, { success: false, message: "Gunakan metode POST." });

    return;
  }

  let input;

  try {
    input = await readJson(req);
  } catch (error) {
    sendJson(res, 400, {
      success: false,
      message: `JSON tidak valid: ${error.message}`,
    });

    return;
  }

  const parsed = parseTarget(String(input.target ?? "").trim());

  if (!parsed) {
    sendJson(res, 422, {
      success: false,
      message: "Target URL tidak valid. Gunakan format http://host[:port].",
    });

    return;
  }

  let method = String(input.method ?? "GET").toUpperCase();

  if (!ALLOWED_METHODS.includes(method)) {
    method = "GET";
  }

  let ip = String(input.ip ?? "").trim();

  if (ip === "") {
    ip = randomPublicIp();
  }

  if (isIP(ip) === 0) {
    sendJson(res, 422, { success: false, message: "Alamat IP tidak valid." });

    return;
  }

  const userAgent = String(input.user_agent ?? "");
  const body = String(input.payload ?? "");

  const basePath = parsed.pathname.replace(/\/+$/, "");
  let requestPath = String(input.path ?? "/").trim();

  if (requestPath === "") {
    requestPath = "/";
  }

  if (!requestPath.startsWith("/")) {
    requestPath = `/${requestPath}`;
  }

  const fullPath = `${basePath}${requestPath}`;
  const fullUrl = `${parsed.origin}${fullPath}`;

  const headers = {
    "CF-Connecting-IP": ip,
    "True-Client-IP": ip,
    "X-Real-IP": ip,
    "X-Forwarded-For": ip,
    Accept: "text/html,application/json;q=0.9,*/*;q=0.8",
  };

  if (userAgent !== "") {
    headers["User-Agent"] = userAgent;
  }

  const hasBody = body !== "" && BODY_METHODS.includes(method);

  if (hasBody) {
    const trimmed = body.trimStart();
    const looksJson = trimmed.startsWith("{") || trimmed.startsWith("[");

    headers["Content-Type"] = looksJson
      ? "application/json"
      : "application/x-www-form-urlencoded";
    headers["Content-Length"] = Buffer.byteLength(body);
  }

  const startedAt = Date.now();
  let result;

  try {
    result = await performRequest({
      protocol: parsed.protocol,
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === "https:" ? 443 : 80),
      path: fullPath,
      method,
      headers,
      body: hasBody ? body : null,
    });
  } catch (error) {
    sendJson(res, 200, {
      success: false,
      message: `Gagal menghubungi target: ${error.message}`,
      ip,
      url: fullUrl,
      method,
    });

    return;
  }

  const durationMs = Date.now() - startedAt;
  const truncated = result.body.length > DISPLAY_LIMIT;

  sendJson(res, 200, {
    success: true,
    ip,
    url: fullUrl,
    base_url: parsed.origin,
    method,
    status: result.status,
    status_text: statusText(result.status),
    blocked: result.status === 403 || result.status === 429,
    duration_ms: durationMs,
    size: result.body.length,
    truncated,
    content_type: result.contentType,
    request_headers: Object.entries(headers)
      .map(([name, value]) => `${name}: ${value}`)
      .join("\n"),
    response_headers: formatRawHeaders(result.rawHeaders),
    body: truncated ? result.body.slice(0, DISPLAY_LIMIT) : result.body,
  });
}

/**
 * Middleware dev-server Vite untuk rute `POST /api/proxy`.
 *
 * Seluruh eksekusi dibungkus try/catch supaya kesalahan tak terduga tidak
 * pernah menjadi unhandled rejection yang bisa menjatuhkan dev-server.
 */
export function createProxyHandler() {
  return async function wafTestingProxy(req, res, next) {
    const route = (req.url ?? "").split("?")[0];

    if (route !== "/api/proxy") {
      next();

      return;
    }

    try {
      await handleProxyRequest(req, res);
    } catch (error) {
      console.error("[waf-testing-proxy] kesalahan tak terduga:", error);

      if (res.headersSent) {
        res.end();

        return;
      }

      sendJson(res, 500, {
        success: false,
        message: `Kesalahan internal proxy: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  };
}
