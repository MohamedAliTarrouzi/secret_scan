import { History as HistoryIcon, ArrowLeft } from "lucide-react"

export default function HistoryPage({ items, onBack }) {
  return (
    <div className="max-w-5xl mx-auto">
      <button
        onClick={onBack}
        className="mb-4 rounded-xl border border-slate-600 px-4 py-2 text-slate-200 hover:bg-slate-700"
      >
        <span className="inline-flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          Retour
        </span>
      </button>

      <div className="rounded-2xl border border-slate-700 bg-slate-800/60 p-6 shadow-2xl">
        <div className="mb-4 flex items-center gap-3">
          <HistoryIcon className="h-6 w-6 text-emerald-400" />
          <h2 className="text-2xl font-semibold">Historique des scans</h2>
        </div>

        {items.length === 0 ? (
          <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-4 text-slate-300">
            Aucun scan enregistré pour l’instant.
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
                  Total détecté : {item.summary?.total || 0}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}