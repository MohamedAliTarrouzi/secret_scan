import React, { useState } from "react";

export default function SubmissionPage() {
  const [mode, setMode] = useState("code"); //'code' | 'url' | 'zip'
  const [code, setCode] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [zipFile, setZipFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
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
    setResult(null);
    if (!validate()) {
      setError("Veuillez remplir le champ correspondant au mode");
      return;
    }
    setLoading(true);
    try {
      if (mode === "zip") {
        const fd = new FormData();
        fd.append("file", zipFile);
        //endpoint: POST /api/scan ; backend must accept multipart or adapt later
        const resp = await fetch(
          `${import.meta.env.VITE_API_URL || "http://localhost:8000"}/api/scan`,
          {
            method: "POST",
            body: fd,
          },
        );
        const json = await resp.json();
        if (!resp.ok) throw new Error(json.detail || JSON.stringify(json));
        setResult(json);
      } else {
        const payload =
          mode === "code"
            ? { target: "inline", content: code }
            : { target: repoUrl };
        const resp = await fetch(
          `${import.meta.env.VITE_API_URL || "http://localhost:8000"}/api/scan`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          },
        );
        const json = await resp.json();
        if (!resp.ok) throw new Error(json.detail || JSON.stringify(json));
        setResult(json);
      }
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Lancer un scan</h1>

      <div className="mb-4">
        <label className="mr-2">Mode:</label>
        <select value={mode} onChange={(e) => setMode(e.target.value)}>
          <option value="code">Coller du code</option>
          <option value="url">URL du dépôt</option>
          <option value="zip">Téléverser un zip</option>
        </select>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        {mode === "code" && (
            <div>
              <label>Coller votre code</label>
              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                rows={12}
                className="w-full p-2 border"
                placeholder="Collez le code à analyser..."
              />
            </div>
          )
          }

        {mode === "url" && (
          <div>
            <label>URL du repo Git</label>
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
            <label>Téléverser un fichier .zip</label>
            <input
              type="file"
              accept=".zip,application/zip"
              onChange={(e) => setZipFile(e.target.files?.[0] ?? null)}
            />
            {zipFile && (
              <div className="text-sm mt-1">
                Fichier: {zipFile.name} ({Math.round(zipFile.size / 1024)} KB)
              </div>
            )}
          </div>
        )}

        <div>
          <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded">
            {loading ? 'En cours…' : 'Lancer le scan'}
          </button>
        </div>
      </form>

       {error && <div className="mt-4 text-red-600">Erreur: {error}</div>}

       {result && (
        <div className="mt-6 p-4 border">
          <h2 className="font-semibold">Résultat</h2>
          <pre className="whitespace-pre-wrap">{JSON.stringify(result, null, 2)}</pre>
        </div>
       )}
    </div>
  );
}
