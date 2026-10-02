export default function AppHeader({ title, subtitle, badge }) {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-800 bg-slate-900/70 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-3">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-sky-600 to-indigo-600 text-xl shadow-lg shadow-sky-900/40">
            🛡️
          </div>
          <div>
            <h1 className="text-base font-extrabold tracking-tight text-slate-100">{title}</h1>
            <p className="text-xs text-slate-400">{subtitle}</p>
          </div>
        </div>

        {badge ? (
          <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-amber-300">
            {badge}
          </span>
        ) : null}
      </div>
    </header>
  );
}
