const METHOD_TONE = {
    GET: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
    POST: "border-sky-500/40 bg-sky-500/10 text-sky-300",
    PUT: "border-amber-500/40 bg-amber-500/10 text-amber-300",
    PATCH: "border-amber-500/40 bg-amber-500/10 text-amber-300",
    DELETE: "border-rose-500/40 bg-rose-500/10 text-rose-300",
};

function Field({ label, value }) {
    if (!value) {
        return null;
    }

    return (
        <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-semibold tracking-wider text-slate-500 uppercase">
                {label}
            </span>
            <span className="font-mono text-[11px] break-all text-slate-300">
                {value}
            </span>
        </div>
    );
}

/**
 * Kartu saran yang muncul setelah sebuah vektor serangan dipilih: menegaskan
 * metode HTTP yang dipilih otomatis, alasan, payload, ekspektasi, dan langkah.
 */
export default function VectorAdvice({ vector, onClear }) {
    if (!vector) {
        return null;
    }

    const method = vector.method ?? "GET";
    const payload =
        vector.payload ??
        (vector.upload
            ? `${vector.upload.filename} — ${vector.upload.content}`
            : null);
    const advice = vector.advice ?? {};

    return (
        <section className="mt-4 rounded-xl border border-sky-600/40 bg-sky-600/5 p-4">
            <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold tracking-wider text-sky-300 uppercase">
                    Saran Vektor
                </span>
                <span
                    className={`rounded border px-2 py-0.5 text-[11px] font-bold ${METHOD_TONE[method] ?? METHOD_TONE.GET}`}
                >
                    {method} · otomatis
                </span>
                {vector.group && (
                    <span className="text-[11px] text-slate-500">
                        {vector.group}
                    </span>
                )}
                <button
                    type="button"
                    onClick={onClear}
                    className="ml-auto rounded-md border border-slate-700 px-2 py-0.5 text-[11px] text-slate-400 transition hover:border-slate-500 hover:text-slate-200"
                >
                    Tutup
                </button>
            </div>

            <h3 className="mt-2 text-sm font-semibold text-slate-100">
                {vector.label}
            </h3>

            {advice.reason && (
                <p className="mt-1 text-xs leading-relaxed text-slate-300">
                    <span className="font-semibold text-sky-300">Metode: </span>
                    {advice.reason}
                </p>
            )}

            <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <Field label="Path / Query" value={vector.path} />
                <Field label="Payload" value={payload} />
                {advice.expect && (
                    <div className="flex flex-col gap-0.5 sm:col-span-2">
                        <span className="text-[10px] font-semibold tracking-wider text-slate-500 uppercase">
                            Ekspektasi
                        </span>
                        <span className="text-[11px] text-slate-300">
                            {advice.expect}
                        </span>
                    </div>
                )}
            </div>

            {advice.steps?.length > 0 && (
                <div className="mt-3">
                    <span className="text-[10px] font-semibold tracking-wider text-slate-500 uppercase">
                        Langkah
                    </span>
                    <ol className="mt-1 list-inside list-decimal space-y-0.5 text-[11px] text-slate-300">
                        {advice.steps.map((step) => (
                            <li key={step}>{step}</li>
                        ))}
                    </ol>
                </div>
            )}
        </section>
    );
}
