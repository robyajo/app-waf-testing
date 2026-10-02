import { useEffect, useMemo, useState } from "react";
import {
    buildAttackJobs,
    injectableFields,
    isAttackable,
} from "./attackBuilder.js";
import { useAttackRunner } from "./useAttackRunner.js";
import AttackResults from "./AttackResults.jsx";
import MethodHint from "./MethodHint.jsx";

const METHOD_TONE = {
    GET: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
    POST: "border-sky-500/40 bg-sky-500/10 text-sky-300",
    PUT: "border-amber-500/40 bg-amber-500/10 text-amber-300",
    PATCH: "border-amber-500/40 bg-amber-500/10 text-amber-300",
    DELETE: "border-rose-500/40 bg-rose-500/10 text-rose-300",
};

const chipClass =
    "rounded-md border border-slate-700 px-3 py-1 font-mono text-[11px] text-amber-300 transition";

/**
 * Menyusun dan menjalankan serangan untuk satu temuan: pilih field injeksi,
 * pilih payload, lalu kirim lewat `sendRaw`.
 */
export default function AttackRunner({ finding, fallbackPath, sendRaw }) {
    const { running, results, progress, run, clear } = useAttackRunner(sendRaw);
    const [selectedPayloads, setSelectedPayloads] = useState([]);
    const [fieldName, setFieldName] = useState("");
    const [customPayload, setCustomPayload] = useState("");

    const fields = useMemo(() => injectableFields(finding), [finding]);
    const payloads = finding?.payloads ?? [];

    useEffect(() => {
        setSelectedPayloads(payloads.slice(0, 1));
        setFieldName(fields[0] ?? "");
        setCustomPayload("");
        clear();
        // Reset hanya saat temuan berubah.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [finding]);

    if (!finding) {
        return (
            <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
                <p className="text-xs text-slate-500">
                    Pilih temuan di kiri untuk mulai menyusun serangan.
                </p>
            </section>
        );
    }

    const togglePayload = (payload) => {
        setSelectedPayloads((prev) =>
            prev.includes(payload)
                ? prev.filter((item) => item !== payload)
                : [...prev, payload],
        );
    };

    const custom = customPayload.trim();
    const activePayloads =
        custom !== ""
            ? [custom]
            : selectedPayloads.length > 0
              ? selectedPayloads
              : payloads.length > 0
                ? [payloads[0]]
                : [""];

    const runOne = () => {
        run(
            buildAttackJobs(
                finding,
                activePayloads.slice(0, 1),
                fieldName,
                fallbackPath,
            ),
        );
    };

    const runAll = () => {
        run(buildAttackJobs(finding, activePayloads, fieldName, fallbackPath));
    };

    const lastResult = results[results.length - 1] ?? null;

    // Ulangi payload terakhir dengan metode yang disarankan server (405).
    const applyMethod = (method) => {
        const payload = lastResult?.payload ?? activePayloads[0] ?? "";

        run(
            buildAttackJobs(
                finding,
                [payload],
                fieldName,
                fallbackPath,
                method,
            ),
        );
    };

    const attackable = isAttackable(finding);

    return (
        <div className="flex flex-col gap-4">
            <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-xl shadow-slate-950/40">
                <div className="flex flex-wrap items-center gap-2">
                    <span
                        className={`rounded border px-2 py-0.5 text-[11px] font-bold ${
                            METHOD_TONE[finding.method] ?? METHOD_TONE.GET
                        }`}
                    >
                        {finding.method}
                    </span>
                    <span className="text-sm font-semibold text-slate-200">
                        {finding.title}
                    </span>
                </div>
                <div className="mt-2 font-mono text-xs break-all text-sky-300">
                    {finding.target}
                </div>
                {finding.recommendation && (
                    <p className="mt-2 text-xs leading-relaxed text-slate-400">
                        {finding.recommendation}
                    </p>
                )}

                {!attackable ? (
                    <p className="mt-4 rounded-lg border border-slate-800 bg-slate-950/50 p-3 text-xs text-slate-500">
                        Temuan ini tidak punya request konkret (mis. komentar
                        atau indikasi error), jadi tidak bisa ditembak langsung.
                    </p>
                ) : (
                    <>
                        {fields.length > 1 && (
                            <div className="mt-4">
                                <label
                                    className="mb-1 block text-xs font-semibold tracking-wider text-slate-400 uppercase"
                                    htmlFor="attack-field"
                                >
                                    Field Injeksi
                                </label>
                                <select
                                    id="attack-field"
                                    value={fieldName}
                                    onChange={(event) =>
                                        setFieldName(event.target.value)
                                    }
                                    className="w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500"
                                >
                                    {fields.map((field) => (
                                        <option key={field} value={field}>
                                            {field}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {payloads.length > 0 && (
                            <div className="mt-4">
                                <p className="mb-2 text-xs font-semibold tracking-wider text-slate-400 uppercase">
                                    Payload (klik untuk pilih)
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {payloads.map((payload) => (
                                        <button
                                            key={payload}
                                            type="button"
                                            onClick={() =>
                                                togglePayload(payload)
                                            }
                                            className={`${chipClass} ${
                                                selectedPayloads.includes(
                                                    payload,
                                                )
                                                    ? "border-amber-500 text-amber-200"
                                                    : "hover:border-amber-500/60"
                                            }`}
                                        >
                                            {payload}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="mt-4">
                            <label
                                className="mb-1 block text-xs font-semibold tracking-wider text-slate-400 uppercase"
                                htmlFor="attack-custom"
                            >
                                Payload Kustom (opsional, menimpa pilihan)
                            </label>
                            <input
                                id="attack-custom"
                                value={customPayload}
                                onChange={(event) =>
                                    setCustomPayload(event.target.value)
                                }
                                placeholder="mis. 1' UNION SELECT ..."
                                className="w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 font-mono text-sm text-slate-100 outline-none focus:border-sky-500"
                            />
                        </div>

                        <div className="mt-5 flex flex-wrap items-center gap-3">
                            <button
                                type="button"
                                onClick={runOne}
                                disabled={running}
                                className="rounded-lg bg-rose-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-rose-900/40 transition hover:bg-rose-500 disabled:opacity-50"
                            >
                                ⚔ Kirim 1 Payload
                            </button>
                            <button
                                type="button"
                                onClick={runAll}
                                disabled={running}
                                className="rounded-lg border border-slate-600 px-5 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-rose-500 disabled:opacity-50"
                            >
                                ⚔ Uji Semua Terpilih ({activePayloads.length})
                            </button>
                            <button
                                type="button"
                                onClick={clear}
                                disabled={running || results.length === 0}
                                className="rounded-lg border border-slate-700 px-4 py-2.5 text-sm text-slate-400 transition hover:border-slate-500 disabled:opacity-40"
                            >
                                Bersihkan
                            </button>
                            {progress !== "" && (
                                <span className="text-xs text-sky-300">
                                    {progress}
                                </span>
                            )}
                        </div>
                    </>
                )}
            </section>

            <MethodHint
                result={lastResult}
                running={running}
                onApplyMethod={applyMethod}
            />

            <AttackResults
                results={results}
                running={running}
                progress={progress}
            />
        </div>
    );
}
