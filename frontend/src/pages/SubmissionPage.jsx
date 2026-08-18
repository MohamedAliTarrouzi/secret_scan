import React, { useState } from "react";
import { runScan } from "../services/api";

export default function SubmissionPage({ onScanCompleted, onOpenHistory }) {
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
    <div className="max-w-3xl mx-auto p-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Run a scan</h1>
      </div>

      <div className="mb-4 flex flex-wrap gap-4">
        <div>
          <label className="mr-2">Mode:</label>
          <select value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="code">Paste code</option>
            <option value="url">Repository URL</option>
            <option value="zip">Upload a zip</option>
          </select>
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        {mode === "code" && (
          <div>
            <label>Paste your code</label>
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              rows={12}
              className="w-full p-2 border"
              placeholder="Paste the code to analyze..."
            />
          </div>
        )}

        {mode === "url" && (
          <div>
            <label>Git repository URL</label>
            <input
              type="url"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              className="w-full p-2 border"
              placeholder="https://github.com/owner/repo"
            />
          </div>
        )}

        {mode === "zip" && (
          <div>
            <label>Upload a .zip file</label>
            <input
              type="file"
              accept=".zip,application/zip"
              onChange={(e) => setZipFile(e.target.files?.[0] ?? null)}
            />
            {zipFile && (
              <div className="text-sm mt-1">
                File: {zipFile.name} ({Math.round(zipFile.size / 1024)} KB)
              </div>
            )}
          </div>
        )}

        <div>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded"
          >
            {loading ? "Running..." : "Run scan"}
          </button>
        </div>
      </form>

      {error && <div className="mt-4 text-red-600">Error: {error}</div>}
    </div>
  );
}