/**
 * Pemetaan status HTTP ke kelas Tailwind untuk badge hasil pengujian.
 * Kelas ditulis literal agar terdeteksi oleh pemindai Tailwind.
 */
export function statusTone(status) {
  if (status === 403 || status === 429) {
    return 'border-rose-500/50 bg-rose-500/15 text-rose-300';
  }

  if (status >= 500) {
    return 'border-rose-500/40 bg-rose-500/10 text-rose-300';
  }

  if (status >= 400) {
    return 'border-amber-500/40 bg-amber-500/10 text-amber-300';
  }

  if (status >= 300) {
    return 'border-sky-500/40 bg-sky-500/10 text-sky-300';
  }

  if (status >= 200) {
    return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300';
  }

  return 'border-slate-700 text-slate-400';
}
