/**
 * Membangun permintaan serangan konkret dari temuan `analyzeSurface`.
 *
 * Setiap temuan membawa `request` terstruktur (method + path + tempat injeksi).
 * Modul ini menggabungkannya dengan payload terpilih menjadi override yang siap
 * dikirim lewat `sendRaw` pada `useWafConsole`.
 */

/** Daftar field/parameter yang bisa disuntik payload pada sebuah temuan. */
export function injectableFields(finding) {
    const request = finding?.request;

    if (!request) {
        return [];
    }

    if (request.inject?.in === "query") {
        return (request.query ?? []).map((param) => param.name);
    }

    if (request.inject?.in === "field") {
        return (request.fields ?? [])
            .filter((field) => field.type !== "file")
            .map((field) => field.name);
    }

    if (request.inject?.in === "json") {
        return request.inject.name ? [request.inject.name] : [];
    }

    return [];
}

export function isAttackable(finding) {
    return Boolean(finding?.request);
}

const HTTP_METHOD_RE =
    /\b(GET|HEAD|POST|PUT|PATCH|DELETE|OPTIONS|CONNECT|TRACE)\b/g;

function extractMethods(text) {
    const matches = String(text).toUpperCase().match(HTTP_METHOD_RE) ?? [];

    return [...new Set(matches)];
}

/**
 * Mendeteksi metode HTTP yang didukung server dari respons 405.
 *
 * Membaca header `Allow` atau pesan khas Laravel
 * "The POST method is not supported for route ... Supported methods: GET, HEAD."
 *
 * @returns {{ allowed: string[], alternatives: string[], current: string, source: string } | null}
 */
export function parseAllowedMethods(result) {
    if (!result || result.status !== 405) {
        return null;
    }

    const headers = result.responseHeaders ?? "";
    const body = result.body ?? "";
    const current = String(result.request?.method ?? "").toUpperCase();

    const headerMatch = /^allow:\s*(.+)$/im.exec(headers);
    let allowed = headerMatch ? extractMethods(headerMatch[1]) : [];
    let source = "header Allow";

    if (allowed.length === 0) {
        const bodyMatch = /supported methods?:\s*([^.\n<]+)/i.exec(body);

        if (bodyMatch) {
            allowed = extractMethods(bodyMatch[1]);
            source = "pesan server";
        }
    }

    if (allowed.length === 0) {
        return null;
    }

    return {
        allowed,
        alternatives: allowed.filter((method) => method !== current),
        current,
        source,
    };
}

/** Nilai aman untuk query/path: netralkan spasi, `#`, `&`, dan newline. */
function encodeForPath(value) {
    return String(value)
        .replace(/[\r\n]+/g, "")
        .replace(/\s/g, "%20")
        .replace(/#/g, "%23")
        .replace(/&/g, "%26");
}

/** Nilai aman untuk body urlencoded: netralkan delimiter `&` dan newline. */
function encodeForBody(value) {
    return String(value)
        .replace(/[\r\n]+/g, "")
        .replace(/&/g, "%26");
}

/**
 * Menyusun override request untuk satu payload.
 *
 * @returns {{ method, path, payload?, contentType?, upload? } | null}
 */
export function buildAttackRequest(
    finding,
    payload,
    fieldName,
    fallbackPath = "/",
    methodOverride = null,
) {
    const request = finding?.request;

    if (!request) {
        return null;
    }

    const method = methodOverride ?? request.method;
    const path = request.path ?? fallbackPath ?? "/";
    const target = fieldName ?? request.inject?.name;

    if (request.inject?.in === "query") {
        const query = (request.query ?? []).map((param) =>
            param.name === target
                ? { name: param.name, value: encodeForPath(payload) }
                : param,
        );
        const queryString = query
            .map((param) => `${param.name}=${param.value ?? ""}`)
            .join("&");

        return { method, path: queryString ? `${path}?${queryString}` : path };
    }

    if (request.inject?.in === "field") {
        const fields = (request.fields ?? []).map((field) =>
            field.name === target
                ? { ...field, value: encodeForBody(payload) }
                : field,
        );
        const body = fields
            .map(
                (field) =>
                    `${encodeURIComponent(field.name)}=${field.value ?? ""}`,
            )
            .join("&");

        return {
            method,
            path,
            payload: body,
            contentType: "application/x-www-form-urlencoded",
        };
    }

    if (request.inject?.in === "file") {
        return {
            method,
            path,
            upload: { ...request.upload, content: payload },
        };
    }

    if (request.inject?.in === "json") {
        return {
            method,
            path,
            payload: JSON.stringify({ [target]: payload }),
            contentType: "application/json",
        };
    }

    return { method, path };
}

/** Menyusun banyak job (satu per payload) untuk dijalankan berurutan. */
export function buildAttackJobs(
    finding,
    payloads,
    fieldName,
    fallbackPath,
    methodOverride = null,
) {
    return payloads
        .map((payload) => ({
            payload,
            request: buildAttackRequest(
                finding,
                payload,
                fieldName,
                fallbackPath,
                methodOverride,
            ),
        }))
        .filter((job) => job.request !== null);
}
