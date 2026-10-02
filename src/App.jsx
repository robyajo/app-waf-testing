import { useWafConsole } from "./hooks/useWafConsole.js";
import AppHeader from "./components/AppHeader.jsx";
import AppFooter from "./components/AppFooter.jsx";
import RequestForm from "./components/RequestForm.jsx";
import ResultPanel from "./components/ResultPanel.jsx";
import HistoryTable from "./components/HistoryTable.jsx";
import PreviewModal from "./components/PreviewModal.jsx";

export default function App() {
  const waf = useWafConsole();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <AppHeader
        title="WAF Test Console"
        subtitle="Laravel Security Monitor · Bulwark"
        badge="Local only"
      />

      <main className="mx-auto max-w-full px-5 py-6">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
          <div className="flex flex-col gap-6">
            <RequestForm
              form={waf.form}
              onChange={waf.update}
              onRandomIp={waf.randomizeIp}
              onSend={() => waf.send()}
              onSendRandom={waf.sendWithRandomIp}
              onBulk={waf.bulkTest}
              onApplyVector={waf.applyVector}
              loading={waf.loading}
              progress={waf.progress}
            />
            <HistoryTable history={waf.history} onClear={waf.clearHistory} />
          </div>

          <ResultPanel
            result={waf.result}
            tab={waf.tab}
            onTab={waf.setTab}
            onOpenPreview={() => waf.setPreviewOpen(true)}
            loading={waf.loading}
            progress={waf.progress}
          />
        </div>

        <AppFooter>
          Hanya untuk pengujian lokal. Header IP virtual dikirim oleh proxy sisi
          server karena browser melarang JavaScript menyetel{" "}
          <code>CF-Connecting-IP</code> / <code>X-Forwarded-For</code>.
        </AppFooter>
      </main>

      <PreviewModal
        open={waf.previewOpen}
        body={waf.result?.body ?? ""}
        baseUrl={waf.result?.base_url ?? ""}
        onClose={() => waf.setPreviewOpen(false)}
      />
    </div>
  );
}
