import { statusTone } from "../lib/http.js";
import PreviewFrame from "./PreviewFrame.jsx";
import SurfacePanel from "./SurfacePanel.jsx";

const TABS = [
    { id: "body", label: "Body" },
    { id: "preview", label: "Pratinjau" },
    { id: "res", label: "Response Headers" },
    { id: "req", label: "Request Headers" },
    { id: "surface", label: "Permukaan Serangan" },
];

function Meta({ label, value, mono = false, tone = "text-slate-200" }) {
    return (
        <div className="rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                {label}
            </div>
            <div className={`truncate ${mono ? "font-mono" : ""} ${tone}`}>
                {value}
            </div>
        </div>
    );
}

/**
 * Origin target dipakai sebagai <base> pada iframe pratinjau.
 * Memakai `base_url` dari proxy bila ada, atau menurunkannya dari `url`.
 */
function baseUrlOf(result) {
    if (!result) {
        return "";
    }

    if (result.base_url) {
        return result.base_url;
    }

    try {
        return new URL(result.url).origin;
    } catch {
        return "";
    }
}

export default function ResultPanel({
    result,
    tab,
    onTab,
    onOpenPreview,
    loading,
    progress,
}) {
    const success = result?.success === true;

    const badgeTone = success ? statusTone(result.status) : statusTone(0);
    const badgeText = success
        ? `${result.status} ${result.status_text}`
        : result
          ? "GAGAL"
          : "MENUNGGU";

    const renderText = () => {
        if (!result) {
            return 'Belum ada permintaan. Isi form lalu klik "Kirim".';
        }

        if (!result.success) {
            return result.message ?? "Terjadi kesalahan.";
        }

        if (tab === "res") {
            return result.response_headers || "(kosong)";
        }

        if (tab === "req") {
            return result.request_headers || "(kosong)";
        }

        return result.body || "(kosong)";
    };

    const showFrame = success && tab === "preview";
    const showSurface = success && tab === "surface";

    return (
        <section className="flex h-full flex-col rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-xl shadow-slate-950/40 xl:sticky xl:top-20">
            <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">
                    Hasil
                </h2>
                <span
                    className={`rounded-full border px-3 py-1 text-xs font-bold ${badgeTone}`}
                >
                    {badgeText}
                </span>
            </div>

            {success && (
                <>
                    <div className="mb-4 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                        <Meta label="IP" value={result.ip} mono />
                        <Meta
                            label="Durasi"
                            value={`${result.duration_ms} ms`}
                        />
                        <Meta label="Ukuran" value={`${result.size} B`} />
                        <Meta
                            label="Blokir"
                            value={result.blocked ? "YA" : "tidak"}
                            tone={
                                result.blocked
                                    ? "text-rose-300"
                                    : "text-emerald-300"
                            }
                        />
                    </div>

                    <div className="mb-3 flex flex-wrap items-center gap-2">
                        <div className="flex flex-wrap rounded-lg border border-slate-700 p-0.5">
                            {TABS.map((item) => (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => onTab(item.id)}
                                    className={`rounded-md px-3 py-1 text-xs font-semibold transition ${
                                        tab === item.id
                                            ? "bg-sky-600 text-white"
                                            : "text-slate-400 hover:text-slate-200"
                                    }`}
                                >
                                    {item.label}
                                </button>
                            ))}
                        </div>
                        <button
                            type="button"
                            onClick={onOpenPreview}
                            className="ml-auto rounded-md border border-slate-700 px-3 py-1 text-xs text-slate-300 transition hover:border-sky-500 hover:text-sky-300"
                        >
                            ⤢ Buka Penuh
                        </button>
                    </div>
                </>
            )}

            <div className="flex min-h-[360px] flex-1 overflow-hidden rounded-lg border border-slate-800 bg-slate-950/80">
                {showFrame ? (
                    <PreviewFrame
                        body={result.body}
                        baseUrl={baseUrlOf(result)}
                        title="Pratinjau target"
                    />
                ) : showSurface ? (
                    <SurfacePanel
                        body={result.body}
                        contentType={result.content_type}
                        baseUrl={baseUrlOf(result)}
                    />
                ) : (
                    <pre className="h-full w-full overflow-auto whitespace-pre-wrap break-words p-4 font-mono text-xs leading-relaxed text-slate-300">
                        {loading
                            ? progress || "Mengirim permintaan..."
                            : renderText()}
                    </pre>
                )}
            </div>

            {success && result.truncated && (
                <p className="mt-2 text-xs text-amber-400">
                    ⚠️ Body dipotong pada 200 KB.
                </p>
            )}
        </section>
    );
}
