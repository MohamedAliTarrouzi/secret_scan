import { useMemo, useState } from "react"
import {
  History as HistoryIcon,
  ChevronDown,
  ChevronRight,
  Search,
} from "lucide-react"
import FindingItem from "../components/FindingItem"
import FindingsFilterBar from "../components/FindingsFilterBar"
import { extractCategories, filterFindings } from "../utils/findingsFilter"

const STATUS_STYLES = {
  BLOCKED: "bg-red-500/10 text-red-300",
  WARNING: "bg-amber-500/10 text-amber-300",
  INFO: "bg-emerald-500/10 text-emerald-300",
}

function statusKeyOf(pipelineMessage) {
  const prefix = (pipelineMessage || "").split(":")[0]?.trim()
  return STATUS_STYLES[prefix] ? prefix : null
}

/** One scan report in the history list: collapsed by default, expands to a
 * full findings browser (search + severity/category filters) scoped to that
 * report only, so digging into an old scan works the same way results do. */
function HistoryEntry({ item }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [activeSeverities, setActiveSeverities] = useState([])
  const [activeCategory, setActiveCategory] = useState("all")

  const findings = item.findings || []
  const summary = item.summary || {}
  const statusKey = statusKeyOf(item.pipeline_message)

  const categories = useMemo(() => extractCategories(findings), [findings])

  const filtered = useMemo(
    () =>
      filterFindings(findings, {
        search,
        severities: activeSeverities,
        category: activeCategory,
      }),
    [findings, search, activeSeverities, activeCategory],
  )

  const toggleSeverity = (sev) => {
    setActiveSeverities((prev) =>
      prev.includes(sev) ? prev.filter((s) => s !== sev) : [...prev, sev],
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-700 bg-slate-900/70">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full flex-wrap items-center gap-3 p-4 text-left"
      >
        {open ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-slate-500" />
        )}

        <p className="font-medium text-white">{item.target}</p>

        {statusKey && (
          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[statusKey]}`}>
            {statusKey}
          </span>
        )}

        <span className="ml-auto flex flex-wrap items-center gap-3 text-sm text-slate-400">
          <span>Total: {summary.total || 0}</span>
          {summary.critical > 0 && <span className="text-red-400">Critical: {summary.critical}</span>}
          {summary.ambiguous > 0 && (
            <span className="text-purple-400">Ambiguous: {summary.ambiguous}</span>
          )}
        </span>
      </button>

      {open && (
        <div className="border-t border-slate-800 p-4 pt-3">
          {findings.length === 0 ? (
            <p className="text-sm text-slate-400">No secrets detected in this scan.</p>
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
                resultCount={filtered.length}
                totalCount={findings.length}
              />

              {filtered.length === 0 ? (
                <p className="text-sm text-slate-400">No findings match your filters.</p>
              ) : (
                <div className="space-y-3">
                  {filtered.map((finding, index) => (
                    <FindingItem
                      key={`${finding.file_path}-${finding.line}-${index}`}
                      item={finding}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default function HistoryPage({ items }) {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  const list = items || []

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return list.filter((item) => {
      if (statusFilter !== "all" && statusKeyOf(item.pipeline_message) !== statusFilter) {
        return false
      }
      if (!q) return true
      return (item.target || "").toLowerCase().includes(q)
    })
  }, [list, search, statusFilter])

  return (
    <div className="max-w-5xl mx-auto">
      <div className="rounded-2xl border border-slate-700 bg-slate-800/60 p-6 shadow-2xl">
        <div className="mb-4 flex items-center gap-3">
          <HistoryIcon className="h-6 w-6 text-emerald-400" />
          <h2 className="text-2xl font-semibold">Scan history</h2>
        </div>

        {list.length === 0 ? (
          <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-4 text-slate-300">
            No scans recorded yet.
          </div>
        ) : (
          <>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by target (file, URL, or repo)..."
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 py-2 pl-9 pr-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
              >
                <option value="all">All statuses</option>
                <option value="BLOCKED">Blocked</option>
                <option value="WARNING">Warning</option>
                <option value="INFO">Info</option>
              </select>
            </div>

            {filtered.length === 0 ? (
              <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-4 text-slate-300">
                No scans match your search.
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map((item, index) => (
                  <HistoryEntry key={`${item.target}-${index}`} item={item} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}