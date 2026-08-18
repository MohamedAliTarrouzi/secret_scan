import React, { useState } from "react";
import { runScan } from "../services/api";

export default function SubmissionPage({ onScanCompleted }) {
  const [mode, setMode] = useState("code"); // 'code' | 'url' | 'zip'
  const [scanScope, setScanScope] = useState("full"); // 'full' | 'diff'
  const [code, setCode] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [zipFile, setZipFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const validate = () => {
    if (mode === "code") return code.trim().length > 0;
    if (mode === "url") return repoUrl.trim().length > 5;
    if (mode === "zip") return zipFile instanceof File;
    return false;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!validate()) {
      setError("Please fill in the field for the selected mode.");
      return;
    }

    setLoading(true);
    try {
      let json;

      if (mode === "zip") {
        const fd = new FormData();
        fd.append("file", zipFile);
        fd.append("scan_scope", scanScope);

        const resp = await fetch(
          `${import.meta.env.VITE_API_URL || "http://localhost:8000"}/api/scan/upload`,
          {
            method: "POST",
            body: fd,
          },
        );
        json = await resp.json();
        if (!resp.ok) throw new Error(json.detail || JSON.stringify(json));
      } else {
        const payload =
          mode === "code"
            ? { target: "inline", content: code, scan_scope: scanScope }
            : { target: repoUrl, scan_scope: scanScope };

        const resp = await runScan(payload.target, payload);
        json = resp.data;
      }

      // Hand the result up to App.jsx so it can switch to the Results page
      // and refresh the history list. Without this, the scan completes but
      // the person is left staring at the submission form.
      onScanCompleted?.(json);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="mb-4">Run a scan</h1>

      <div className="mb-4 flex flex-wrap gap-4">
        <div>
          <label className="mr-2 text-sm text-slate-400">Mode</label>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-slate-100"
          >
            <option value="code">Paste code</option>
            <option value="url">Repository URL</option>
            <option value="zip">Upload a zip</option>
          </select>
        </div>

        <div>
          <label className="mr-2 text-sm text-slate-400">Scope</label>
          <select
            value={scanScope}
            onChange={(e) => setScanScope(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-slate-100"
          >
            <option value="full">Full scan</option>
            <option value="diff">Diff only</option>
          </select>
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        {mode === "code" && (
          <div>
            <label className="text-sm text-slate-400">Paste your code</label>
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              rows={12}
              className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 p-3 font-mono text-sm text-slate-100"
              placeholder="Paste the code to analyze..."
            />
          </div>
        )}

        {mode === "url" && (
          <div>
            <label className="text-sm text-slate-400">Git repository URL</label>
            <input
              type="url"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 p-3 text-slate-100"
              placeholder="https://github.com/owner/repo"
            />
          </div>
        )}

        {mode === "zip" && (
          <div>
            <label className="text-sm text-slate-400">Upload a .zip file</label>
            <input
              type="file"
              accept=".zip,application/zip"
              onChange={(e) => setZipFile(e.target.files?.[0] ?? null)}
              className="mt-1 block text-sm text-slate-300"
            />
            {zipFile && (
              <div className="mt-1 text-sm text-slate-400">
                File: {zipFile.name} ({Math.round(zipFile.size / 1024)} KB)
              </div>
            )}
          </div>
        )}

        <div>
          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-500 disabled:opacity-50"
          >
            {loading ? "Running..." : "Run scan"}
          </button>
        </div>
      </form>

      {error && <div className="mt-4 text-red-400">Error: {error}</div>}
    </div>
  );
}