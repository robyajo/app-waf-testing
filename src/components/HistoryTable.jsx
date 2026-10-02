import { statusTone } from '../lib/http.js';

export default function HistoryTable({ history, onClear }) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-xl shadow-slate-950/40">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">Riwayat</h2>
        <button
          type="button"
          onClick={onClear}
          className="rounded-md border border-slate-700 px-3 py-1 text-xs text-slate-400 transition hover:border-rose-500 hover:text-rose-300"
        >
          Bersihkan
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-[11px] uppercase tracking-wider text-slate-500">
              <th className="py-2 pr-3 font-semibold">Waktu</th>
              <th className="py-2 pr-3 font-semibold">IP</th>
              <th className="py-2 pr-3 font-semibold">Path</th>
              <th className="py-2 pr-3 font-semibold">Status</th>
              <th className="py-2 font-semibold">ms</th>
            </tr>
          </thead>
          <tbody>
            {history.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-6 text-center text-slate-500">
                  Belum ada riwayat.
                </td>
              </tr>
            ) : (
              history.map((row, index) => (
                <tr key={`${row.time}-${row.ip}-${index}`} className="border-t border-slate-800">
                  <td className="py-2 pr-3 text-slate-500">{row.time}</td>
                  <td className="py-2 pr-3 font-mono text-slate-300">{row.ip}</td>
                  <td className="py-2 pr-3 font-mono text-slate-400">{row.path}</td>
                  <td className="py-2 pr-3">
                    <span
                      className={`rounded border px-2 py-0.5 text-xs font-bold ${statusTone(row.status)}`}
                    >
                      {row.status}
                    </span>
                  </td>
                  <td className="py-2 text-slate-500">{row.ms}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
