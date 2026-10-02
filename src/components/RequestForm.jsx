import { attackVectorGroups, userAgentPresets } from "../lib/vectors.js";
import VectorAdvice from "./VectorAdvice.jsx";

const inputClass =
    "w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30";

const labelClass =
    "mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400";

const chipClass =
    "rounded-md border border-slate-700 px-3 py-1 text-xs text-slate-300 transition hover:border-sky-500 hover:text-sky-300";

export default function RequestForm({
    form,
    onChange,
    onRandomIp,
    onSend,
    onSendRandom,
    onBulk,
    onApplyVector,
    activeVector,
    onClearVector,
    loading,
    progress,
}) {
    return (
        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-xl shadow-slate-950/40">
            <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">
                    Permintaan Uji
                </h2>
                <span className="font-mono text-xs text-slate-500">
                    POST /api/proxy
                </span>
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
                        onChange={(event) =>
                            onChange({ target: event.target.value })
                        }
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
                        onChange={(event) =>
                            onChange({ path: event.target.value })
                        }
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
                        onChange={(event) =>
                            onChange({ method: event.target.value })
                        }
                    >
                        {[
                            "GET",
                            "POST",
                            "PUT",
                            "PATCH",
                            "DELETE",
                            "HEAD",
                            "OPTIONS",
                        ].map((method) => (
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
                            onChange={(event) =>
                                onChange({ ip: event.target.value })
                            }
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
                        onChange={(event) =>
                            onChange({ userAgent: event.target.value })
                        }
                        placeholder="Mozilla/5.0 ..."
                    />
                    <div className="mt-2 flex flex-wrap gap-2">
                        {userAgentPresets.map((preset) => (
                            <button
                                key={preset.label}
                                type="button"
                                onClick={() =>
                                    onChange({ userAgent: preset.value })
                                }
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
                        onChange={(event) =>
                            onChange({ payload: event.target.value })
                        }
                        placeholder='{"email":"a@b.com","password":"123456"}'
                    />
                </div>

                <div className="sm:col-span-2">
                    <label className={labelClass} htmlFor="contentType">
                        Content-Type (opsional)
                    </label>
                    <input
                        id="contentType"
                        className={inputClass}
                        value={form.contentType}
                        onChange={(event) =>
                            onChange({ contentType: event.target.value })
                        }
                        placeholder="Kosongkan = deteksi otomatis (JSON / form-urlencoded)"
                    />
                </div>

                <div className="sm:col-span-2 rounded-xl border border-slate-800 bg-slate-950/40 p-4">
                    <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                        <input
                            type="checkbox"
                            className="h-4 w-4 accent-sky-500"
                            checked={form.uploadEnabled}
                            onChange={(event) =>
                                onChange({
                                    uploadEnabled: event.target.checked,
                                })
                            }
                        />
                        Unggah Berkas · multipart/form-data
                    </label>
                    <p className="mt-1 text-[11px] text-slate-500">
                        Untuk uji Arbitrary File Upload / webshell. Aktif saat
                        metode POST / PUT / PATCH.
                    </p>

                    {form.uploadEnabled && (
                        <div className="mt-3 grid gap-3 sm:grid-cols-3">
                            <div>
                                <label
                                    className={labelClass}
                                    htmlFor="uploadField"
                                >
                                    Nama Field
                                </label>
                                <input
                                    id="uploadField"
                                    className={inputClass}
                                    value={form.uploadField}
                                    onChange={(event) =>
                                        onChange({
                                            uploadField: event.target.value,
                                        })
                                    }
                                    placeholder="file"
                                />
                            </div>
                            <div>
                                <label
                                    className={labelClass}
                                    htmlFor="uploadFilename"
                                >
                                    Nama Berkas
                                </label>
                                <input
                                    id="uploadFilename"
                                    className={inputClass}
                                    value={form.uploadFilename}
                                    onChange={(event) =>
                                        onChange({
                                            uploadFilename: event.target.value,
                                        })
                                    }
                                    placeholder="shell.php"
                                />
                            </div>
                            <div>
                                <label
                                    className={labelClass}
                                    htmlFor="uploadType"
                                >
                                    Tipe Berkas
                                </label>
                                <input
                                    id="uploadType"
                                    className={inputClass}
                                    value={form.uploadType}
                                    onChange={(event) =>
                                        onChange({
                                            uploadType: event.target.value,
                                        })
                                    }
                                    placeholder="application/x-php"
                                />
                            </div>
                            <div className="sm:col-span-3">
                                <label
                                    className={labelClass}
                                    htmlFor="uploadContent"
                                >
                                    Isi Berkas
                                </label>
                                <textarea
                                    id="uploadContent"
                                    rows={3}
                                    className={inputClass}
                                    value={form.uploadContent}
                                    onChange={(event) =>
                                        onChange({
                                            uploadContent: event.target.value,
                                        })
                                    }
                                    placeholder={
                                        '<?php system($_GET["cmd"]); ?>'
                                    }
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="mt-5 space-y-4">
                <p className={labelClass}>
                    Vektor Serangan (klik untuk mengisi)
                </p>
                {attackVectorGroups.map(({ group, items }) => (
                    <div key={group}>
                        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                            {group}
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {items.map((vector) => (
                                <button
                                    key={vector.label}
                                    type="button"
                                    onClick={() => onApplyVector(vector, group)}
                                    className={`rounded-md border px-3 py-1 text-xs transition ${
                                        activeVector?.label === vector.label
                                            ? "border-rose-500 text-rose-300"
                                            : "border-slate-700 text-slate-300 hover:border-rose-500 hover:text-rose-300"
                                    }`}
                                >
                                    {vector.label}
                                </button>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            <VectorAdvice vector={activeVector} onClear={onClearVector} />

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
                {progress !== "" && (
                    <span className="text-xs text-sky-300">{progress}</span>
                )}
            </div>
        </section>
    );
}
