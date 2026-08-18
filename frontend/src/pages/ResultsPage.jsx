import { AlertTriangle, ShieldCheck } from "lucide-react"

export default function ResultsPage({ result }) {
  if (!result) {
    return (
      <div className="rounded-2xl border border-slate-700 bg-slate-800/60 p-6 text-slate-300">
        No scan result yet. Run a scan first.
      </div>
    )
  }

  const summary = result.summary || {}

  return (
    <div className="max-w-6xl mx-auto">
      <div className="rounded-2xl border border-slate-700 bg-slate-800/60 p-6 shadow-2xl">
        <div className="mb-6 flex items-center gap-3">
          <ShieldCheck className="h-6 w-6 text-emerald-400" />
          <div>
            <h2 className="text-2xl font-semibold">Scan results</h2>
            <p className="text-sm text-slate-400">
              Target: <span className="text-slate-200">{result.target}</span>
            </p>
          </div>
        </div>

        <div className="mb-4 rounded-xl border border-slate-700 bg-slate-900/70 p-4">
         <p className="font-semibold text-white">
          {result.pipeline_message || "No message"}
         </p>
        </div>

        <div className="mb-6 grid gap-3 md:grid-cols-5">
          <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-4">
           <p className="text-sm text-slate-400">Total</p>
           <p className="text-2xl font-semibold text-white">{summary.total || 0}</p>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-4">
           <p className="text-sm text-slate-400">Critical</p>
           <p className="text-2xl font-semibold text-red-400">{summary.critical || 0}</p>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-4">
            <p className="text-sm text-slate-400">Medium</p>
            <p className="text-2xl font-semibold text-amber-400">{summary.medium || 0}</p>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-4">
            <p className="text-sm text-slate-400">Low</p>
            <p className="text-2xl font-semibold text-blue-400">{summary.low || 0}</p>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-4">
            <p className="text-sm text-slate-400">Ambiguous</p>
            <p className="text-2xl font-semibold text-purple-400">{summary.ambiguous || 0}</p>
          </div>
        </div>

        {result.findings?.length === 0 ? (
          <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-4 text-slate-300">
            No secrets detected.
          </div>
        ) : (
          <div className="space-y-3">
            {result.findings.map((item, index) => (
              <div
                key={`${item.file_path}-${item.line}-${index}`}
                className="rounded-xl border border-slate-700 bg-slate-900/70 p-4"
              >
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-red-500/10 px-2.5 py-1 text-sm text-red-300">
                    {item.severity}
                  </span>
                  {item.review_required && (
                    <span className="rounded-full bg-purple-500/10 px-2.5 py-1 text-sm text-purple-300">
                      LLM review
                    </span>
                  )}
                  <span className="text-sm text-slate-400">{item.category}</span>
                  <span className="font-mono text-sm text-slate-400">
                    {item.file_path}:{item.line}
                  </span>
                </div>

                <p className="font-medium text-white">{item.name}</p>
                <p className="mt-1 font-mono text-sm text-slate-300">{item.context}</p>
                <p className="mt-1 text-sm text-slate-400">Entropy: {item.entropy}</p>
                <div className="mt-3 flex items-center gap-2 text-sm text-amber-400">
                  <AlertTriangle className="h-4 w-4" />
                  <span>{item.description}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}