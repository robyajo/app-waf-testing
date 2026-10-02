import { useEffect, useState } from "react";
import { randomPublicIp } from "../lib/ip.js";
import { recommendedMethod } from "../lib/vectors.js";

const STORAGE_KEY = "waf-test-console-v1";
const MAX_HISTORY = 50;

const DEFAULT_FORM = {
    target: "http://localhost:8000",
    path: "/",
    ip: "",
    method: "GET",
    userAgent: "",
    payload: "",
    contentType: "",
    uploadEnabled: false,
    uploadField: "file",
    uploadFilename: "shell.php",
    uploadType: "application/x-php",
    uploadContent: '<?php system($_GET["cmd"]); ?>',
};

function loadStoredForm() {
    try {
        const stored =
            JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}") ?? {};

        return { ...DEFAULT_FORM, ...stored };
    } catch {
        return { ...DEFAULT_FORM };
    }
}

/**
 * Seluruh state + logika jaringan konsol uji WAF.
 *
 * Dipisah dari UI supaya `App.jsx` tetap tipis (hanya menyusun komponen) dan
 * logika bisa dipakai ulang / diuji tanpa me-render halaman.
 */
export function useWafConsole() {
    const [form, setForm] = useState(loadStoredForm);
    const [result, setResult] = useState(null);
    const [history, setHistory] = useState([]);
    const [tab, setTab] = useState("body");
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState("");
    const [previewOpen, setPreviewOpen] = useState(false);
    const [activeVector, setActiveVector] = useState(null);

    useEffect(() => {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(form));
    }, [form]);

    const update = (patch) => setForm((prev) => ({ ...prev, ...patch }));

    const randomizeIp = () => update({ ip: randomPublicIp() });

    const postProxy = async (payload) => {
        const response = await fetch("/api/proxy", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });

        return response.json();
    };

    const send = async (ipOverride) => {
        const target = form.target.trim();

        if (target === "") {
            setResult({ success: false, message: "URL target wajib diisi." });

            return null;
        }

        const ip = (ipOverride ?? form.ip).trim();
        const path = form.path.trim() || "/";

        setLoading(true);

        try {
            const data = await postProxy({
                target,
                path,
                ip,
                method: form.method,
                user_agent: form.userAgent.trim(),
                payload: form.payload,
                content_type: form.contentType.trim(),
                upload: form.uploadEnabled
                    ? {
                          field: form.uploadField.trim() || "file",
                          filename: form.uploadFilename.trim() || "shell.php",
                          content_type:
                              form.uploadType.trim() ||
                              "application/octet-stream",
                          content: form.uploadContent,
                      }
                    : null,
            });

            setResult(data);

            if (data.success) {
                update({ ip: data.ip });
                setTab("body");
                setHistory((prev) =>
                    [
                        {
                            time: new Date().toLocaleTimeString(),
                            ip: data.ip,
                            path,
                            status: data.status,
                            ms: data.duration_ms,
                        },
                        ...prev,
                    ].slice(0, MAX_HISTORY),
                );
            }

            return data;
        } catch (error) {
            // Kegagalan fetch di level jaringan (dev-server mati / koneksi putus)
            // dilempar sebagai TypeError, bukan Error biasa.
            const unreachable = error instanceof TypeError;

            setResult({
                success: false,
                message: unreachable
                    ? 'Tidak dapat menghubungi dev-server (/api/proxy). Pastikan "npm run dev" masih berjalan, lalu muat ulang halaman ini.'
                    : `Kesalahan jaringan: ${error.message}`,
            });

            return null;
        } finally {
            setLoading(false);
        }
    };

    /**
     * Mengirim permintaan arbitrer tanpa menyentuh state `result`/`history`.
     * Dipakai tab "Pengujian Serangan" supaya serangan tidak mengubah temuan
     * pada tab pertama.
     */
    const sendRaw = async (override = {}) => {
        const payload = {
            target: (override.target ?? form.target).trim(),
            path: (override.path ?? form.path).trim() || "/",
            ip: (override.ip ?? form.ip ?? "").trim(),
            method: override.method ?? form.method,
            user_agent: (override.userAgent ?? form.userAgent ?? "").trim(),
            payload: override.payload ?? "",
            content_type: (override.contentType ?? "").trim(),
            upload: override.upload ?? null,
        };

        try {
            return await postProxy(payload);
        } catch (error) {
            return {
                success: false,
                message: `Kesalahan jaringan: ${error.message}`,
            };
        }
    };

    const sendWithRandomIp = async () => {
        const ip = randomPublicIp();
        update({ ip });
        await send(ip);
    };

    const bulkTest = async (count) => {
        for (let index = 0; index < count; index += 1) {
            const ip = randomPublicIp();
            update({ ip });
            setProgress(`Menguji ${index + 1}/${count} IP acak...`);

            await send(ip);
        }

        setProgress("");
    };

    const applyVector = (vector, group) => {
        const upload = vector.upload;
        const method = recommendedMethod(vector);

        update({
            path: vector.path,
            method,
            ...(vector.userAgent !== undefined
                ? { userAgent: vector.userAgent }
                : {}),
            ...(vector.payload !== undefined
                ? { payload: vector.payload }
                : {}),
            uploadEnabled: Boolean(upload),
            ...(upload
                ? {
                      uploadField: upload.field ?? form.uploadField,
                      uploadFilename: upload.filename ?? form.uploadFilename,
                      uploadType: upload.content_type ?? form.uploadType,
                      uploadContent: upload.content ?? form.uploadContent,
                  }
                : {}),
        });

        setActiveVector({
            ...vector,
            method,
            group: group ?? vector.group ?? "",
        });
    };

    const clearVector = () => setActiveVector(null);

    const clearHistory = () => setHistory([]);

    return {
        form,
        update,
        result,
        history,
        tab,
        setTab,
        loading,
        progress,
        previewOpen,
        setPreviewOpen,
        send,
        sendRaw,
        activeVector,
        clearVector,
        randomizeIp,
        sendWithRandomIp,
        bulkTest,
        applyVector,
        clearHistory,
    };
}
