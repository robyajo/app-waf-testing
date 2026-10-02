import { useEffect, useState } from "react";
import AttackFindingList from "./AttackFindingList.jsx";
import AttackRunner from "./AttackRunner.jsx";

/**
 * Tab "Pengujian Serangan": menurunkan temuan dari body respons tab pertama
 * (`findings` hasil `analyzeSurface`) dan menjalankan serangan per temuan.
 */
export default function AttackTab({
    result,
    findings,
    sendRaw,
    fallbackPath = "/",
}) {
    const firstAttackable = findings.findIndex((finding) => finding.request);
    const [selectedIndex, setSelectedIndex] = useState(
        firstAttackable >= 0 ? firstAttackable : 0,
    );

    // Jaga indeks tetap valid saat daftar temuan berubah.
    useEffect(() => {
        setSelectedIndex((prev) => {
            if (findings[prev]?.request) {
                return prev;
            }

            const index = findings.findIndex((finding) => finding.request);

            return index >= 0 ? index : 0;
        });
    }, [findings]);

    if (!result) {
        return (
            <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-sm text-slate-400">
                Belum ada hasil di tab{" "}
                <span className="text-slate-200">Konsol Uji</span>. Kirim satu
                permintaan terlebih dahulu agar temuan bisa dianalisis dan
                diserang dari sini.
            </section>
        );
    }

    return (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
            <AttackFindingList
                findings={findings}
                selectedIndex={selectedIndex}
                onSelect={setSelectedIndex}
            />
            <AttackRunner
                finding={findings[selectedIndex] ?? null}
                fallbackPath={fallbackPath}
                sendRaw={sendRaw}
            />
        </div>
    );
}
