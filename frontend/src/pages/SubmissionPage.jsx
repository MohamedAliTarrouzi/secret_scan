import { useState } from "react"
import { Search, Loader2 } from "lucide-react"
import { runScan } from "../services/api"

export default function SubmissionPage({ onScanCompleted, onOpenHistory }) {
  const [target, setTarget] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const response = await runScan(target)
      onScanCompleted(response.data)
    } catch (err) {
      setError(err.response?.data?.detail || "Échec du scan")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-8 shadow-2xl">
        <h2 className="text-2xl font-semibold mb-3">Soumettre une cible</h2>
        <p className="text-slate-400 mb-6">
          Entrez un chemin local, un fichier .zip/.tar, ou une URL GitHub.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <textarea
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="Exemple : C:/chemin/vers/fichier.txt | https://github.com/owner/repo"
            className="w-full min-h-[140px] bg-slate-900 border border-slate-700 rounded-xl p-4 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 font-medium text-white hover:bg-emerald-500 disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analyse en cours...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4" />
                  Lancer le scan
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onOpenHistory}
              className="rounded-xl border border-slate-600 px-5 py-3 text-slate-200 hover:bg-slate-700"
            >
              Voir l’historique
            </button>
          </div>
        </form>

        {error && (
          <div className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-red-300">
            {error}
          </div>
        )}
      </div>
    </div>
  )
}