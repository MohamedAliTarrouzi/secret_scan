import { useState } from "react"
import {
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  HelpCircle,
  Bot,
} from "lucide-react"

const SEVERITY_STYLES = {
  Critical: "bg-red-500/10 text-red-300",
  Medium: "bg-amber-500/10 text-amber-300",
  Low: "bg-blue-500/10 text-blue-300",
  Ambiguous: "bg-purple-500/10 text-purple-300",
}

const VERDICT_META = {
  secret: {
    label: "Confirmed secret",
    className: "bg-red-500/10 text-red-300",
    Icon: ShieldAlert,
  },
  false_positive: {
    label: "False positive",
    className: "bg-emerald-500/10 text-emerald-300",
    Icon: CheckCircle2,
  },
  uncertain: {
    label: "Uncertain",
    className: "bg-amber-500/10 text-amber-300",
    Icon: HelpCircle,
  },
}

export default function FindingItem({ item, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)

  const severityClass = SEVERITY_STYLES[item.severity] || "bg-slate-500/10 text-slate-300"
  const verdict = item.llm_verdict ? VERDICT_META[item.llm_verdict] : null

  return (
    <div className="overflow-hidden rounded-xl border border-slate-700 bg-slate-900/70">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full flex-wrap items-center gap-2 p-4 text-left"
      >
        {open ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-slate-500" />
        )}

        <span className={`rounded-full px-2.5 py-1 text-sm ${severityClass}`}>
          {item.severity}
        </span>
        <span className="text-sm text-slate-400">{item.category}</span>
        <span className="font-medium text-white">{item.name}</span>
        <span className="truncate font-mono text-sm text-slate-400">
          {item.file_path}:{item.line}
        </span>

        <span className="ml-auto flex items-center gap-2">
          {verdict && (
            <span
              className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs ${verdict.className}`}
            >
              <verdict.Icon className="h-3.5 w-3.5" />
              {verdict.label}
            </span>
          )}
          {!verdict && item.llm_error && (
            <span className="flex items-center gap-1 rounded-full bg-slate-700/50 px-2.5 py-1 text-xs text-slate-300">
              <Bot className="h-3.5 w-3.5" />
              LLM review failed
            </span>
          )}
          {!verdict && !item.llm_error && item.review_required && (
            <span className="flex items-center gap-1 rounded-full bg-purple-500/10 px-2.5 py-1 text-xs text-purple-300">
              <Bot className="h-3.5 w-3.5" />
              Awaiting review
            </span>
          )}
        </span>
      </button>

      {open && (
        <div className="space-y-3 border-t border-slate-800 p-4 pt-3">
          <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-lg bg-slate-950/60 p-3 font-mono text-sm text-slate-300">
            {item.context}
          </pre>

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-400">
            <span>Entropy: {item.entropy ?? "—"}</span>
            <span>
              Confidence:{" "}
              {item.confidence != null ? `${Math.round(item.confidence * 100)}%` : "—"}
            </span>
          </div>

          {item.description && (
            <div className="flex items-start gap-2 text-sm text-amber-400">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{item.description}</span>
            </div>
          )}

          {(verdict || item.llm_error) && (
            <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
              <div className="mb-1 flex items-center gap-2 text-sm font-medium text-white">
                <Bot className="h-4 w-4" />
                LLM review
                {item.llm_model && (
                  <span className="text-xs font-normal text-slate-500">
                    ({item.llm_model})
                  </span>
                )}
              </div>

              {item.llm_error ? (
                <p className="text-sm text-slate-400">Review failed: {item.llm_error}</p>
              ) : (
                <>
                  <p className="text-sm text-slate-300">{item.llm_reason}</p>
                  {item.llm_confidence != null && (
                    <p className="mt-1 text-xs text-slate-500">
                      LLM confidence: {Math.round(item.llm_confidence * 100)}%
                    </p>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}