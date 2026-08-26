import { Search, X } from "lucide-react"
import { SEVERITIES, SOURCES } from "../utils/findingsFilter"

export default function FindingsFilterBar({
  search,
  onSearchChange,
  activeSeverities,
  onToggleSeverity,
  categories = [],
  activeCategory = "all",
  onCategoryChange,
  activeSource = "all",
  onSourceChange,
  placeholder = "Search by name, file, value, or LLM verdict...",
  resultCount,
  totalCount,
}) {
  const hasActiveFilters =
    search.trim().length > 0 || activeSeverities.length > 0 || activeCategory !== "all" || activeSource !== "all"

  const clearAll = () => {
    onSearchChange("")
    activeSeverities.forEach((sev) => onToggleSeverity(sev))
    onCategoryChange?.("all")
    onSourceChange?.("all")
  }

  return (
    <div className="mb-4 space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={placeholder}
            className="w-full rounded-xl border border-slate-700 bg-slate-900 py-2 pl-9 pr-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
          />
        </div>

        {categories.length > 0 && (
          <select
            value={activeCategory}
            onChange={(e) => onCategoryChange?.(e.target.value)}
            className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
          >
            <option value="all">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        )}

        {onSourceChange && (
          <select
            value={activeSource}
            onChange={(e) => onSourceChange(e.target.value)}
            className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
          >
            {SOURCES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.id === "all" ? "All sources" : s.label}
              </option>
            ))}
          </select>
        )}

        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearAll}
            className="flex items-center gap-1 rounded-xl border border-slate-700 px-3 py-2 text-sm text-slate-400 hover:border-slate-600 hover:text-slate-200"
          >
            <X className="h-3.5 w-3.5" />
            Clear
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {SEVERITIES.map((sev) => {
          const active = activeSeverities.includes(sev)
          return (
            <button
              key={sev}
              type="button"
              onClick={() => onToggleSeverity(sev)}
              className={[
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                active
                  ? "border-emerald-500 bg-emerald-500/10 text-emerald-300"
                  : "border-slate-700 text-slate-400 hover:border-slate-600",
              ].join(" ")}
            >
              {sev}
            </button>
          )
        })}

        {typeof resultCount === "number" && (
          <span className="ml-auto text-xs text-slate-500">
            {resultCount} of {totalCount} finding{totalCount === 1 ? "" : "s"}
          </span>
        )}
      </div>
    </div>
  )
}