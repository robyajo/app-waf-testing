/**
 * Navigasi tab tingkat atas (Konsol Uji / Pengujian Serangan).
 */
export default function AppTabs({ tabs, active, onChange }) {
    return (
        <div className="mb-6 flex flex-wrap gap-2 border-b border-slate-800">
            {tabs.map((tab) => (
                <button
                    key={tab.id}
                    type="button"
                    onClick={() => onChange(tab.id)}
                    className={`-mb-px flex items-center gap-2 rounded-t-lg border-b-2 px-4 py-2 text-sm font-semibold transition ${
                        active === tab.id
                            ? "border-sky-500 text-sky-300"
                            : "border-transparent text-slate-400 hover:text-slate-200"
                    }`}
                >
                    {tab.label}
                    {tab.badge != null && (
                        <span className="rounded-full border border-slate-700 px-2 py-0.5 text-[10px] text-slate-400">
                            {tab.badge}
                        </span>
                    )}
                </button>
            ))}
        </div>
    );
}
