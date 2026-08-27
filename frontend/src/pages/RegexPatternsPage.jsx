import { useEffect, useState } from "react";

const API_BASE_URL =
  import.meta.env?.VITE_API_BASE_URL ?? "http://localhost:8000";

export default function RegexPatternsPage() {
  const [text, setText] = useState("[]");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info"); // "success" | "error" | "info"
  const [loading, setLoading] = useState(false);

  const loadPatterns = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/regex-patterns`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Unable to load patterns");
      }

      setText(JSON.stringify(data.patterns, null, 2));
      setMessage("");
    } catch (error) {
      setMessage(error.message || "Error loading patterns.");
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPatterns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const validatePatterns = (payload) => {
    if (!Array.isArray(payload)) {
      throw new Error("Top level JSON must be an array of pattern objects");
    }

    payload.forEach((pattern, index) => {
      const label = pattern?.name || `pattern #${index + 1}`;

      if (!pattern.name) {
        throw new Error(`Entry ${index + 1} is missing a "name"`);
      }
      if (!pattern.regex) {
        throw new Error(`"${label}" is missing a "regex"`);
      }

      try {
        // Confirm the regex actually compiles before it reaches the scanner.
        new RegExp(pattern.regex, pattern.flags?.toLowerCase?.() ?? "");
      } catch (regexError) {
        throw new Error(`"${label}" has an invalid regex: ${regexError.message}`);
      }
    });
  };

  const savePatterns = async () => {
    setLoading(true);
    try {
      const payload = JSON.parse(text);
      validatePatterns(payload);

      const response = await fetch(`${API_BASE_URL}/api/regex-patterns`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patterns: payload }),
      });

      const data = await response.json();

      if (!response.ok || data.status !== "saved") {
        throw new Error(data.detail || "Error saving patterns");
      }

      setMessage("Saved to the active file.");
      setMessageType("success");
    } catch (error) {
      setMessage(
        error instanceof SyntaxError
          ? "Invalid JSON — fix the syntax before saving."
          : error.message || "Error saving patterns.",
      );
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  const restoreBackup = async () => {
    const confirmed = window.confirm(
      "This replaces the active file with the backup and discards any unsaved edits in the textarea. Continue?",
    );
    if (!confirmed) return;

    setLoading(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/regex-patterns/restore-backup`,
        { method: "POST" },
      );

      const data = await response.json();

      if (!response.ok || data.status !== "restored") {
        throw new Error(data.detail || "Unable to restore backup");
      }

      setText(JSON.stringify(data.patterns, null, 2));
      setMessage("Backup restored to the active file.");
      setMessageType("success");
    } catch (error) {
      setMessage(error.message || "Error restoring backup.");
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl">
      <h2 className="mb-4 text-2xl font-bold">Regex Pattern Management</h2>

      <p className="mb-4 text-sm text-slate-400">
        Paste a JSON array of regex objects here. The active file is used by
        the scanner.
      </p>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={24}
        aria-label="Regex patterns JSON"
        disabled={loading}
        className="w-full border border-slate-700 bg-slate-900 p-3 text-sm text-slate-100 disabled:opacity-60"
      />

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          onClick={savePatterns}
          disabled={loading}
          className="rounded-xl bg-emerald-600 px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Working…" : "Save to active file"}
        </button>

        <button
          onClick={restoreBackup}
          disabled={loading}
          className="rounded-xl bg-slate-700 px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Working…" : "Restore Backup"}
        </button>
      </div>

      {message && (
        <p
          role="status"
          className={
            "mt-2 text-sm " +
            (messageType === "error"
              ? "text-red-400"
              : messageType === "success"
                ? "text-emerald-400"
                : "text-slate-300")
          }
        >
          {message}
        </p>
      )}
    </div>
  );
}