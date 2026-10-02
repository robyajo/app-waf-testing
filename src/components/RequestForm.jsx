import { attackVectors, userAgentPresets } from '../lib/vectors.js';

const inputClass =
  'w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30';

const labelClass = 'mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400';

const chipClass =
  'rounded-md border border-slate-700 px-3 py-1 text-xs text-slate-300 transition hover:border-sky-500 hover:text-sky-300';

export default function RequestForm({
  form,
  onChange,
  onRandomIp,
  onSend,
  onSendRandom,
  onBulk,
  onApplyVector,
  loading,
  progress,
}) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-xl shadow-slate-950/40">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">
          Permintaan Uji
        </h2>
        <span className="font-mono text-xs text-slate-500">POST /api/proxy</span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={labelClass} htmlFor="target">
            URL Target
          </label>
          <input
            id="target"
            className={inputClass}
            value={form.target}
            onChange={(event) => onChange({ target: event.target.value })}
            placeholder="http://localhost:8000"
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="path">
            Path / Query
          </label>
          <input
            id="path"
            className={inputClass}
            value={form.path}
            onChange={(event) => onChange({ path: event.target.value })}
            placeholder="/"
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="method">
            Metode
          </label>
          <select
            id="method"
            className={inputClass}
            value={form.method}
            onChange={(event) => onChange({ method: event.target.value })}
          >
            {['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'].map((method) => (
              <option key={method} value={method}>
                {method}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2">
          <label className={labelClass} htmlFor="ip">
            IP Virtual (spoofed)
          </label>
          <div className="flex gap-2">
            <input
              id="ip"
              className={inputClass}
              value={form.ip}
              onChange={(event) => onChange({ ip: event.target.value })}
              placeholder="Kosongkan = IP publik acak otomatis"
            />
            <button
              type="button"
              onClick={onRandomIp}
              className="shrink-0 rounded-lg border border-sky-600/50 bg-sky-600/10 px-4 py-2 text-sm font-semibold text-sky-300 transition hover:bg-sky-600/20"
            >
              🎲 IP Acak
            </button>
          </div>
        </div>

        <div className="sm:col-span-2">
          <label className={labelClass} htmlFor="userAgent">
            User-Agent
          </label>
          <input
            id="userAgent"
            className={inputClass}
            value={form.userAgent}
            onChange={(event) => onChange({ userAgent: event.target.value })}
            placeholder="Mozilla/5.0 ..."
          />
          <div className="mt-2 flex flex-wrap gap-2">
            {userAgentPresets.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => onChange({ userAgent: preset.value })}
                className={chipClass}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <div className="sm:col-span-2">
          <label className={labelClass} htmlFor="payload">
            Payload Body (POST/PUT/PATCH/DELETE)
          </label>
          <textarea
            id="payload"
            rows={3}
            className={inputClass}
            value={form.payload}
            onChange={(event) => onChange({ payload: event.target.value })}
            placeholder='{"email":"a@b.com","password":"123456"}'
          />
        </div>
      </div>

      <div className="mt-5">
        <p className={labelClass}>Vektor Serangan (klik untuk mengisi)</p>
        <div className="flex flex-wrap gap-2">
          {attackVectors.map((vector) => (
            <button
              key={vector.label}
              type="button"
              onClick={() => onApplyVector(vector)}
              className="rounded-md border border-slate-700 px-3 py-1 text-xs text-slate-300 transition hover:border-rose-500 hover:text-rose-300"
            >
              {vector.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onSend}
          disabled={loading}
          className="rounded-lg bg-sky-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-sky-900/40 transition hover:bg-sky-500 disabled:opacity-50"
        >
          Kirim
        </button>
        <button
          type="button"
          onClick={onSendRandom}
          disabled={loading}
          className="rounded-lg border border-slate-600 px-5 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-sky-500 disabled:opacity-50"
        >
          🎲 Kirim + IP Acak Baru
        </button>
        <button
          type="button"
          onClick={() => onBulk(5)}
          disabled={loading}
          className="rounded-lg border border-slate-600 px-5 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-sky-500 disabled:opacity-50"
        >
          Uji 5 IP Acak
        </button>
        {progress !== '' && <span className="text-xs text-sky-300">{progress}</span>}
      </div>
    </section>
  );
}
