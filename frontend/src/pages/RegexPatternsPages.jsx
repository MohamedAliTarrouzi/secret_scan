import { useEffect, useState } from "react";

export default function RegexPatternsPage() {
  const [text, setText] = useState("[]");
  const [message, setMessage] = useState("");

  const loadPatterns = async () => {
    const response = await fetch("http://localhost:8000/api/regex-patterns");
    const data = await response.json();
    setText(JSON.stringify(data.patterns, null, 2));
  };

  useEffect(() => {
    loadPatterns();
  }, []);

  const savePatterns = async () => {
    try {
      const payload = JSON.parse(text);
      const response = await fetch("http://localhost:8000/api/regex-patterns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patterns: payload }),
      });

      const data = await response.json();

      setMessage(
        data.status === "saved"
          ? "Saved to the active file"
          : "Error",
      );
    } catch {
      setMessage("Invalid JSON");
    }
  };

  const restoreBackup = async () => {
    try {
      const response = await fetch(
        "http://localhost:8000/api/regex-patterns/restore-backup",
        {
          method: "POST",
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Unable to restore backup");
      }

      if (data.status === "restored") {
        setText(JSON.stringify(data.patterns, null, 2));
        setMessage("Backup restored to the active file.");
      } else {
        setMessage("Error restoring backup.");
      }
    } catch (error) {
      setMessage(error.message || "Error restoring backup.");
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
        className="w-full border border-slate-700 bg-slate-900 p-3 text-sm text-slate-100"
      />

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          onClick={savePatterns}
          className="rounded-xl bg-emerald-600 px-4 py-2 text-white"
        >
          Save to active file
        </button>

        <button
          onClick={restoreBackup}
          className="rounded-xl bg-slate-700 px-4 py-2 text-white"
        >
          Restore Backup
        </button>
      </div>

      {message && (
        <p className="mt-2 text-sm text-slate-300">
          {message}
        </p>
      )}
    </div>
  );
}