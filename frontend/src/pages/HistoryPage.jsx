import { History as HistoryIcon } from "lucide-react"

export default function HistoryPage({ items }) {
  return (
    <div className="max-w-5xl mx-auto">
      <div className="rounded-2xl border border-slate-700 bg-slate-800/60 p-6 shadow-2xl">
        <div className="mb-4 flex items-center gap-3">
          <HistoryIcon className="h-6 w-6 text-emerald-400" />
          <h2 className="text-2xl font-semibold">Scan history</h2>
        </div>

        {items.length === 0 ? (
          <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-4 text-slate-300">
            No scans recorded yet.
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item, index) => (
              <div
                key={`${item.target}-${index}`}
                className="rounded-xl border border-slate-700 bg-slate-900/70 p-4"
              >
                <p className="font-medium text-white">{item.target}</p>
                <p className="mt-1 text-sm text-slate-400">
                  Total detected: {item.summary?.total || 0}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}