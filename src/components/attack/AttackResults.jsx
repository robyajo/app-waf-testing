import { useState } from "react";
import { statusTone } from "../../lib/http.js";
import { parseAllowedMethods } from "./attackBuilder.js";

function ResultRow({ result }) {
    const [open, setOpen] = useState(false);
    const hint = parseAllowedMethods(result);

    return (
        <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-3">
            <div className="flex flex-wrap items-center gap-2">
                <span
                    className={`rounded border px-2 py-0.5 text-[11px] font-bold ${statusTone(result.status)}`}
                >
                    {result.status || "ERR"}
                </span>
                <span className="rounded border border-slate-700 px-2 py-0.5 text-[11px] font-bold text-slate-300">
                    {result.request.method}
                </span>
                {result.blocked && (
                    <span className="rounded border border-rose-500/40 bg-rose-500/10 px-2 py-0.5 text-[11px] font-bold text-rose-300">
                        DIBLOKIR
                    </span>
                )}
                <span className="font-mono text-[11px] text-slate-500">
                    {result.durationMs} ms · {result.size} B
                </span>
                <button
                    type="button"
                    onClick={() => setOpen((value) => !value)}
                    className="ml-auto text-[11px] text-sky-300 transition hover:text-sky-200"
                >
                    {open ? "Sembunyikan" : "Lihat body"}
                </button>
            </div>

            <div className="mt-2 font-mono text-[11px] break-all text-sky-300">
                {result.request.method} {result.request.path}
            </div>

            {hint && (
                <div className="mt-1 text-[11px] text-amber-300">
                    Metode didukung server: {hint.allowed.join(", ")}
                </div>
            )}

            {result.payload && (
                <div className="mt-1 font-mono text-[11px] break-all text-amber-300">
                    payload: {result.payload}
                </div>
            )}

            {open && (
                <pre className="mt-2 max-h-48 overflow-auto rounded border border-slate-800 bg-slate-950 p-2 font-mono text-[11px] whitespace-pre-wrap text-slate-300">
                    {result.body || "(kosong)"}
                </pre>
            )}
        </div>
    );
}

export default function AttackResults({ results, running, progress }) {
    return (
        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-xl shadow-slate-950/40">
            <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">
                    Hasil Serangan
                </h2>
                {progress !== "" && (
                    <span className="text-xs text-sky-300">{progress}</span>
                )}
            </div>

            {results.length === 0 ? (
                <p className="text-xs text-slate-500">
                    {running
                        ? "Menjalankan serangan..."
                        : "Belum ada serangan yang dijalankan."}
                </p>
            ) : (
                <div className="flex max-h-110 flex-col gap-2 overflow-auto pr-1">
                    {results.map((result, index) => (
                        <ResultRow
                            key={`${result.request.path}-${result.payload}-${index}`}
                            result={result}
                        />
                    ))}
                </div>
            )}
        </section>
    );
}
