import { useState } from "react";
import { randomPublicIp } from "../../lib/ip.js";

/**
 * Menjalankan rangkaian serangan lewat `sendRaw` tanpa mengubah state tab
 * pertama. Hasil dikumpulkan agar bisa ditampilkan di `AttackResults`.
 */
export function useAttackRunner(sendRaw) {
    const [running, setRunning] = useState(false);
    const [results, setResults] = useState([]);
    const [progress, setProgress] = useState("");

    const run = async (jobs) => {
        if (!sendRaw || jobs.length === 0) {
            return [];
        }

        setRunning(true);
        const collected = [];

        for (let index = 0; index < jobs.length; index += 1) {
            setProgress(`Menjalankan serangan ${index + 1}/${jobs.length}...`);

            const job = jobs[index];
            const data = await sendRaw({
                ...job.request,
                ip: randomPublicIp(),
            });

            collected.push({
                ...job,
                ip: data?.ip ?? "",
                status: data?.status ?? 0,
                statusText: data?.status_text ?? "",
                blocked: data?.blocked ?? false,
                durationMs: data?.duration_ms ?? 0,
                size: data?.size ?? 0,
                responseHeaders: data?.response_headers ?? "",
                body: data?.body ?? data?.message ?? "",
            });
            setResults([...collected]);
        }

        setProgress("");
        setRunning(false);

        return collected;
    };

    const clear = () => setResults([]);

    return { running, results, progress, run, clear };
}
