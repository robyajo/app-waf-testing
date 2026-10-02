const KIND_LABEL = {
    form: "Formulir",
    param: "Parameter",
    endpoint: "Endpoint",
    upload: "Unggah",
    comment: "Komentar",
    error: "Error",
};

const METHOD_TONE = {
    GET: "text-emerald-300",
    POST: "text-sky-300",
    PUT: "text-amber-300",
    PATCH: "text-amber-300",
    DELETE: "text-rose-300",
};

/**
 * Daftar temuan dari tab pertama; temuan yang punya `request` bisa dipilih
 * untuk diserang.
 */
export default function AttackFindingList({ findings, selectedIndex, onSelect }) {
    return (
        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-xl shadow-slate-950/40">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-300">
                Temuan dari Tab Konsol
            </h2>

            {findings.length === 0 ? (
                <p className="text-xs text-slate-500">
                    Belum ada temuan. Kirim permintaan di tab{" "}
                    <span className="text-slate-300">Konsol Uji</span> terlebih
                    dahulu, lalu buka tab ini.
                </p>
            ) : (
                <ul className="flex max-h-[600px] flex-col gap-2 overflow-auto pr-1">
                    {findings.map((finding, index) => {
                        const active = index === selectedIndex;
                        const attackable = Boolean(finding.request);

                        return (
                            <li
                                key={`${finding.kind}-${finding.target}-${index}`}
                            >
                                <button
                                    type="button"
                                    disabled={!attackable}
                                    onClick={() => onSelect(index)}
                                    className={`w-full rounded-lg border px-3 py-2 text-left transition ${
                                        active
                                            ? "border-sky-500 bg-sky-500/10"
                                            : "border-slate-800 bg-slate-950/40 hover:border-slate-600"
                                    } ${attackable ? "" : "opacity-50"}`}
                                >
                                    <div className="flex items-center gap-2">
                                        <span className="rounded border border-slate-700 px-2 py-0.5 text-[10px] font-bold text-slate-400">
                                            {KIND_LABEL[finding.kind] ??
                                                finding.kind}
                                        </span>
                                        <span
                                            className={`rounded border border-slate-700 px-2 py-0.5 text-[10px] font-bold ${
                                                METHOD_TONE[finding.method] ??
                                                "text-slate-300"
                                            }`}
                                        >
                                            {finding.method}
                                        </span>
                                        {!attackable && (
                                            <span className="text-[10px] text-slate-500">
                                                tanpa request
                                            </span>
                                        )}
                                    </div>
                                    <div className="mt-1 truncate text-xs font-semibold text-slate-200">
                                        {finding.title}
                                    </div>
                                    <div className="mt-0.5 truncate font-mono text-[11px] text-sky-300">
                                        {finding.target}
                                    </div>
                                </button>
                            </li>
                        );
                    })}
                </ul>
            )}
        </section>
    );
}
