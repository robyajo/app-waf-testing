import { useMemo } from "react";
import { analyzeSurface } from "../lib/surface.js";

const KIND_META = {
  form: { label: "Formulir", tone: "border-sky-500/40 bg-sky-500/10 text-sky-300" },
  param: { label: "Parameter", tone: "border-amber-500/40 bg-amber-500/10 text-amber-300" },
  endpoint: { label: "Endpoint", tone: "border-violet-500/40 bg-violet-500/10 text-violet-300" },
  upload: { label: "Unggah Berkas", tone: "border-rose-500/40 bg-rose-500/10 text-rose-300" },
  comment: { label: "Komentar", tone: "border-slate-600 bg-slate-700/20 text-slate-300" },
  error: { label: "Indikasi Error", tone: "border-rose-500/40 bg-rose-500/10 text-rose-300" },
};

const METHOD_TONE = {
  GET: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  POST: "border-sky-500/40 bg-sky-500/10 text-sky-300",
  PUT: "border-amber-500/40 bg-amber-500/10 text-amber-300",
  PATCH: "border-amber-500/40 bg-amber-500/10 text-amber-300",
  DELETE: "border-rose-500/40 bg-rose-500/10 text-rose-300",
};

const SUMMARY_ITEMS = [
  { key: "form", label: "Formulir" },
  { key: "param", label: "Parameter" },
  { key: "endpoint", label: "Endpoint" },
  { key: "upload", label: "Unggah" },
  { key: "error", label: "Error" },
];

function Badge({ children, className = "" }) {
  return (
    <span className={`rounded border px-2 py-0.5 text-[11px] font-bold ${className}`}>
      {children}
    </span>
  );
}

function FindingCard({ finding }) {
  const kind = KIND_META[finding.kind] ?? KIND_META.endpoint;
  const methodTone = METHOD_TONE[finding.method] ?? METHOD_TONE.GET;

  return (
    <article className="rounded-lg border border-slate-800 bg-slate-950/50 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge className={kind.tone}>{kind.label}</Badge>
        <Badge className={methodTone}>{finding.method}</Badge>
        <span className="text-sm font-semibold text-slate-200">{finding.title}</span>
      </div>

      <div className="mt-2 font-mono text-xs text-sky-300 break-all">{finding.target}</div>

      {finding.detail && <p className="mt-1 text-xs text-slate-400">{finding.detail}</p>}

      {finding.risks?.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {finding.risks.map((risk) => (
            <span
              key={risk}
              className="rounded border border-rose-500/30 bg-rose-500/5 px-2 py-0.5 text-[11px] text-rose-300"
            >
              {risk}
            </span>
          ))}
        </div>
      )}

      {finding.recommendation && (
        <p className="mt-2 text-xs leading-relaxed text-slate-300">
          <span className="font-semibold text-slate-400">Rekomendasi: </span>
          {finding.recommendation}
        </p>
      )}

      {finding.payloads?.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {finding.payloads.map((payload) => (
            <code
              key={payload}
              className="rounded border border-slate-700 bg-slate-900 px-2 py-0.5 font-mono text-[11px] text-amber-300"
            >
              {payload}
            </code>
          ))}
        </div>
      )}
    </article>
  );
}

/**
 * Tab analisis permukaan serangan: menurunkan titik injeksi dari body respons
 * beserta metode HTTP dan payload yang direkomendasikan.
 */
export default function SurfacePanel({ body, contentType, baseUrl }) {
  const { findings, summary } = useMemo(
    () => analyzeSurface(body ?? "", { contentType: contentType ?? "", baseUrl: baseUrl ?? "" }),
    [body, contentType, baseUrl],
  );

  if (findings.length === 0) {
    return (
      <div className="p-4 text-xs text-slate-500">
        Tidak ada titik serangan yang terdeteksi pada body ini. Pastikan respons berisi
        HTML/JSON, atau kirim permintaan yang mengembalikan halaman target.
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-auto p-4">
      <div className="mb-3 flex flex-wrap gap-2">
        {SUMMARY_ITEMS.filter((item) => summary[item.key] > 0).map((item) => (
          <span
            key={item.key}
            className="rounded-full border border-slate-700 bg-slate-900/70 px-3 py-1 text-[11px] font-semibold text-slate-300"
          >
            {item.label}: <span className="text-sky-300">{summary[item.key]}</span>
          </span>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        {findings.map((finding, index) => (
          <FindingCard key={`${finding.kind}-${finding.target}-${index}`} finding={finding} />
        ))}
      </div>
    </div>
  );
}
