import { useMemo, useState } from "react";
import {
  History as HistoryIcon,
  ChevronDown,
  ChevronRight,
  Search,
  Trash2,
  X,
} from "lucide-react";

import FindingItem from "../components/FindingItem";
import FindingsFilterBar from "../components/FindingsFilterBar";
import { extractCategories, filterFindings } from "../utils/findingsFilter";

import { deleteHistoryItem, deleteAllHistory } from "../services/api";

const STATUS_STYLES = {
  BLOCKED: "bg-red-500/10 text-red-300",
  WARNING: "bg-amber-500/10 text-amber-300",
  INFO: "bg-emerald-500/10 text-emerald-300",
};

function statusKeyOf(pipelineMessage) {
  const prefix = (pipelineMessage || "").split(":")[0]?.trim();
  return STATUS_STYLES[prefix] ? prefix : null;
}

/**
 * One scan report in the history list.
 * Collapsed by default and expandable to show its findings.
 */
function HistoryEntry({ item, onDelete }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeSeverities, setActiveSeverities] = useState([]);
  const [activeCategory, setActiveCategory] = useState("all");
  const [activeSource, setActiveSource] = useState("all");
  const findings = item.findings || [];
  const summary = item.summary || {};
  const statusKey = statusKeyOf(item.pipeline_message);

  const categories = useMemo(() => extractCategories(findings), [findings]);

  const filtered = useMemo(
    () =>
      filterFindings(findings, {
        search,
        severities: activeSeverities,
        category: activeCategory,
        source: activeSource,
      }),
    [findings, search, activeSeverities, activeCategory, activeSource],
  );

  const toggleSeverity = (sev) => {
    setActiveSeverities((prev) =>
      prev.includes(sev) ? prev.filter((s) => s !== sev) : [...prev, sev],
    );
  };

  return (
    <div className="overflow-hidden rounded-xl border border-slate-700 bg-slate-900/70">
      <div className="flex items-center gap-3 p-4">
        {/* Expand / collapse */}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="shrink-0 rounded-lg p-1 transition hover:bg-slate-800"
          aria-label={open ? "Collapse scan" : "Expand scan"}
        >
          {open ? (
            <ChevronDown className="h-4 w-4 text-slate-500" />
          ) : (
            <ChevronRight className="h-4 w-4 text-slate-500" />
          )}
        </button>

        {/* Scan information */}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="min-w-0 flex-1 text-left"
        >
          <div className="flex flex-wrap items-center gap-3">
            <p className="truncate font-medium text-white">{item.target}</p>

            {statusKey && (
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[statusKey]}`}
              >
                {statusKey}
              </span>
            )}
          </div>
        </button>

        {/* Summary */}
        <div className="hidden shrink-0 items-center gap-3 text-sm text-slate-400 sm:flex">
          <span>Total: {summary.total || 0}</span>

          {summary.critical > 0 && (
            <span className="text-red-400">Critical: {summary.critical}</span>
          )}

          {summary.ambiguous > 0 && (
            <span className="text-purple-400">
              Ambiguous: {summary.ambiguous}
            </span>
          )}
        </div>

        {/* Delete */}
        <button
          type="button"
          onClick={() => onDelete(item)}
          className="shrink-0 rounded-lg border border-red-500/20 bg-red-500/5 p-2 text-slate-500 transition hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-400"
          title="Delete scan"
          aria-label={`Delete scan ${item.target}`}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Mobile summary */}
      <div className="flex flex-wrap items-center gap-3 border-t border-slate-800/50 px-4 pb-3 text-xs text-slate-500 sm:hidden">
        <span>Total: {summary.total || 0}</span>

        {summary.critical > 0 && (
          <span className="text-red-400">Critical: {summary.critical}</span>
        )}

        {summary.ambiguous > 0 && (
          <span className="text-purple-400">
            Ambiguous: {summary.ambiguous}
          </span>
        )}
      </div>

      {/* Findings */}
      {open && (
        <div className="border-t border-slate-800 p-4 pt-3">
          {findings.length === 0 ? (
            <p className="text-sm text-slate-400">
              No secrets detected in this scan.
            </p>
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
                <p className="text-sm text-slate-400">
                  No findings match your filters.
                </p>
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
  );
}

export default function HistoryPage({ items, onHistoryChanged }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deletingId, setDeletingId] = useState(null);
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState("");

  const list = items || [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return list.filter((item) => {
      if (
        statusFilter !== "all" &&
        statusKeyOf(item.pipeline_message) !== statusFilter
      ) {
        return false;
      }

      if (!q) return true;

      return (item.target || "").toLowerCase().includes(q);
    });
  }, [list, search, statusFilter]);

  const handleDelete = async (item) => {
    const confirmed = window.confirm(
      `Delete this scan from history?\n\n${item.target}`,
    );

    if (!confirmed) return;

    try {
      setError("");
      setDeletingId(item.id);

      await deleteHistoryItem(item.id);

      if (onHistoryChanged) {
        await onHistoryChanged();
      }
    } catch (err) {
      console.error("Failed to delete history item:", err);

      setError(
        err?.response?.data?.detail ||
          "Failed to delete this scan from history.",
      );
    } finally {
      setDeletingId(null);
    }
  };

  const handleClearHistory = async () => {
    if (list.length === 0) return;

    const confirmed = window.confirm(
      "Clear the entire scan history?\n\nThis action cannot be undone.",
    );

    if (!confirmed) return;

    try {
      setError("");
      setClearing(true);

      await deleteAllHistory();

      if (onHistoryChanged) {
        await onHistoryChanged();
      }
    } catch (err) {
      console.error("Failed to clear history:", err);

      setError(err?.response?.data?.detail || "Failed to clear scan history.");
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl">
      <div className="rounded-2xl border border-slate-700 bg-slate-800/60 p-6 shadow-2xl">
        {/* Header */}
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-2">
              <HistoryIcon className="h-6 w-6 text-emerald-400" />
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-white">
                Scan history
              </h2>

              <p className="text-sm text-slate-500">
                {list.length} {list.length === 1 ? "scan" : "scans"} recorded
              </p>
            </div>
          </div>

          {/* Clear history */}
          {list.length > 0 && (
            <button
              type="button"
              onClick={handleClearHistory}
              disabled={clearing}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-2.5 text-sm font-medium text-red-300 transition hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />

              {clearing ? "Clearing..." : "Clear history"}
            </button>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-300">
            <X className="mt-0.5 h-4 w-4 shrink-0" />

            <div>
              <p className="font-medium">Action failed</p>

              <p className="mt-1 text-red-300/80">{error}</p>
            </div>
          </div>
        )}

        {/* Empty state */}
        {list.length === 0 ? (
          <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-6 text-center">
            <HistoryIcon className="mx-auto mb-3 h-8 w-8 text-slate-600" />

            <p className="text-slate-300">No scans recorded yet.</p>

            <p className="mt-1 text-sm text-slate-500">
              Your completed scans will appear here.
            </p>
          </div>
        ) : (
          <>
            {/* Search + status filter */}
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

            {/* No search results */}
            {filtered.length === 0 ? (
              <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-4 text-slate-300">
                No scans match your search.
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map((item) => (
                  <HistoryEntry
                    key={item.id}
                    item={item}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
