import { useMemo, useState } from "react"
import { ShieldCheck } from "lucide-react"
import FindingItem from "../components/FindingItem"
import FindingsFilterBar from "../components/FindingsFilterBar"
import { extractCategories, filterFindings } from "../utils/findingsFilter"

export default function ResultsPage({ result }) {
  const [search, setSearch] = useState("")
  const [activeSeverities, setActiveSeverities] = useState([])
  const [activeCategory, setActiveCategory] = useState("all")
  const [activeSource, setActiveSource] = useState("all")

  const findings = result?.findings || []

  const categories = useMemo(() => extractCategories(findings), [findings])

  const filtered = useMemo(
    () =>
      filterFindings(findings, {
        search,
        severities: activeSeverities,
        category: activeCategory,
        source: activeSource,
      }),
    [findings, search, activeSeverities, activeCategory, activeSource],
  )

  const toggleSeverity = (sev) => {
    setActiveSeverities((prev) =>
      prev.includes(sev) ? prev.filter((s) => s !== sev) : [...prev, sev],
    )
  }

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
          <p className="font-semibold text-white">{result.pipeline_message || "No message"}</p>
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

        {findings.length === 0 ? (
          <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-4 text-slate-300">
            No secrets detected.
          </div>
        ) : (
          <>
            <FindingsFilterBar
              search={search}
              onSearchChange={setSearch}
              activeSeverities={activeSeverities}
              onToggleSeverity={toggleSeverity}
              categories={categories}
              activeCategory={activeCategory}
              onCategoryChange={setActiveCategory}
              activeSource={activeSource}
              onSourceChange={setActiveSource}
              resultCount={filtered.length}
              totalCount={findings.length}
            />

            {filtered.length === 0 ? (
              <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-4 text-slate-300">
                No findings match your filters.
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map((item, index) => (
                  <FindingItem key={`${item.file_path}-${item.line}-${index}`} item={item} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}