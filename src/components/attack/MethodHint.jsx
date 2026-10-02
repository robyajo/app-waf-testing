import { parseAllowedMethods } from "./attackBuilder.js";

/**
 * Saran metode saat server membalas 405 (Method Not Allowed).
 *
 * Menampilkan metode yang benar-benar didukung server dan tombol untuk
 * mengulang serangan dengan metode tersebut.
 */
export default function MethodHint({ result, running, onApplyMethod }) {
    const hint = parseAllowedMethods(result);

    if (!hint) {
        return null;
    }

    return (
        <section className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-4">
            <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold tracking-wider text-amber-300 uppercase">
                    Metode tidak didukung (405)
                </span>
                <span className="text-[11px] text-slate-400">
                    dari {hint.source}
                </span>
            </div>

            <p className="mt-1 text-xs leading-relaxed text-slate-300">
                Server menolak{" "}
                <span className="font-mono text-rose-300">
                    {hint.current || "metode ini"}
                </span>{" "}
                pada route ini. Metode yang didukung:{" "}
                <span className="font-mono text-emerald-300">
                    {hint.allowed.join(", ")}
                </span>
                . Status <span className="font-mono">405</span> (bukan 403)
                berarti WAF tidak memblokir — router aplikasi yang menolak.
            </p>

            {hint.alternatives.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="text-[11px] text-slate-500">
                        Coba ulang dengan metode:
                    </span>
                    {hint.alternatives.map((method) => (
                        <button
                            key={method}
                            type="button"
                            disabled={running}
                            onClick={() => onApplyMethod(method)}
                            className="rounded-md border border-amber-500/50 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-200 transition hover:bg-amber-500/20 disabled:opacity-50"
                        >
                            {method}
                        </button>
                    ))}
                </div>
            )}
        </section>
    );
}
