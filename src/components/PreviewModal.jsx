import PreviewFrame from "./PreviewFrame.jsx";

export default function PreviewModal({ open, body, baseUrl = "", onClose }) {
  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="flex h-[85vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
        role="presentation"
      >
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
          <h3 className="text-sm font-bold text-slate-200">
            Pratinjau target (sandbox)
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-700 px-3 py-1 text-xs text-slate-300 transition hover:border-rose-500 hover:text-rose-300"
          >
            Tutup ✕
          </button>
        </div>
        <PreviewFrame body={body} baseUrl={baseUrl} title="Pratinjau target" />
      </div>
    </div>
  );
}
