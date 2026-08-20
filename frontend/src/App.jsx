import { useEffect, useState } from "react"
import { Shield, Search, History as HistoryIcon, Braces } from "lucide-react"

import SubmissionPage from "./pages/SubmissionPage"
import ResultsPage from "./pages/ResultsPage"
import HistoryPage from "./pages/HistoryPage"
import RegexPatternsPage from "./pages/RegexPatternsPages"
import { getHistory } from "./services/api"

const NAV_ITEMS = [
  { id: "submission", label: "Scan", icon: Search },
  { id: "results", label: "Results", icon: Shield, requiresResult: true },
  { id: "regex", label: "Regex Patterns", icon: Braces },
  { id: "history", label: "History", icon: HistoryIcon },
]

export default function App() {
  const [view, setView] = useState("submission")
  const [results, setResults] = useState(null)
  const [history, setHistory] = useState([])

  const refreshHistory = async () => {
    try {
      const response = await getHistory()
      setHistory(response.data || [])
    } catch (err) {
      console.error("Failed to load history:", err)
    }
  }

  useEffect(() => {
    refreshHistory()
  }, [])

  const goTo = (id) => {
    if (id === "history") refreshHistory()
    setView(id)
  }

  return (
    <div className="min-h-screen flex bg-bg-primary text-slate-100">
      <aside className="w-64 shrink-0 border-r border-slate-800 bg-slate-950/60 flex flex-col">
        <div className="px-6 py-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <Shield className="h-7 w-7 text-emerald-400" />
            <span className="font-mono text-lg font-semibold tracking-wide bg-gradient-to-r from-emerald-400 to-blue-500 bg-clip-text text-transparent">
              SecretScan
            </span>
          </div>
          {/* Scanning-line accent under the brand mark */}
          <div className="mt-3 h-px w-full bg-gradient-to-r from-emerald-400/70 via-blue-500/40 to-transparent" />
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_ITEMS.map(({ id, label, icon: Icon, requiresResult }) => {
            const disabled = requiresResult && !results
            const active = view === id

            return (
              <button
                key={id}
                type="button"
                disabled={disabled}
                onClick={() => goTo(id)}
                className={[
                  "w-full flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-slate-800 text-white border-l-2 border-emerald-400 pl-[14px]"
                    : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-100",
                  disabled ? "opacity-40 cursor-not-allowed hover:bg-transparent" : "",
                ].join(" ")}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </button>
            )
          })}
        </nav>

        <div className="px-4 py-4 border-t border-slate-800">
          <div className="flex items-center gap-2 rounded-xl bg-slate-900/70 px-3 py-2 font-mono text-xs text-emerald-400">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            Connected to API
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-8">
        <div className="max-w-6xl mx-auto">
          {view === "submission" && (
            <SubmissionPage
              onScanCompleted={(data) => {
                setResults(data)
                setView("results")
                refreshHistory()
              }}
            />
          )}

          {view === "results" && <ResultsPage result={results} />}

          {view === "history" && <HistoryPage items={history} onHistoryChanged={refreshHistory}/>}

          {view === "regex" && <RegexPatternsPage />}
        </div>
      </main>
    </div>
  )
}