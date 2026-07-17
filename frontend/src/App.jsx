import { useEffect, useState } from "react"
import { Shield, CheckCircle, Search, History as HistoryIcon } from "lucide-react"

import SubmissionPage from "./pages/SubmissionPage"
import ResultsPage from "./pages/ResultsPage"
import HistoryPage from "./pages/HistoryPage"
import { getHistory } from "./services/api"

export default function App() {
  const [view, setView] = useState("submission")
  const [results, setResults] = useState(null)
  const [history, setHistory] = useState([])

  const refreshHistory = async () => {
    try {
      const response = await getHistory()
      setHistory(response.data || [])
    } catch (err) {
      console.error("Erreur chargement historique:", err)
    }
  }

  useEffect(() => {
    refreshHistory()
  }, [])

  return (
    <div className="min-h-screen flex flex-col text-slate-100">
      <header className="border-b border-slate-800 px-8 py-4 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-emerald-400" />
            <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-blue-500 bg-clip-text text-transparent">
              SecretScan
            </h1>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setView("submission")}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800"
            >
              <Search className="h-4 w-4" />
              Soumission
            </button>

            <button
              onClick={() => {
                setView("history")
                refreshHistory()
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800"
            >
              <HistoryIcon className="h-4 w-4" />
              Historique
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 p-8 max-w-7xl mx-auto w-full">
        <div className="mb-8 rounded-2xl border border-slate-700 bg-slate-800/50 p-6">
          <div className="flex items-center gap-2 text-emerald-400">
            <CheckCircle className="w-5 h-5" />
            <span className="font-medium">Connecté à l’API FastAPI</span>
          </div>
        </div>

        {view === "submission" && (
          <SubmissionPage
            onScanCompleted={(data) => {
              setResults(data)
              setView("results")
              refreshHistory()
            }}
            onOpenHistory={() => {
              setView("history")
              refreshHistory()
            }}
          />
        )}

        {view === "results" && (
          <ResultsPage
            result={results}
            onBack={() => setView("submission")}
            onOpenHistory={() => {
              setView("history")
              refreshHistory()
            }}
          />
        )}

        {view === "history" && (
          <HistoryPage
            items={history}
            onBack={() => setView("submission")}
          />
        )}
      </main>
    </div>
  )
}