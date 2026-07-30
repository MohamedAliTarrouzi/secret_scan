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
        data.status === "saved" ? "Enregistré dans le fichier actif" : "Erreur",
      );
    } catch {
      setMessage("JSON invalide");
    }
  };

  const rewriteBackup = async () => {
    const response = await fetch(
      "http://localhost:8000/api/regex-patterns/rewrite-backup",
      {
        method: "POST",
      },
    );
    const data = await response.json();
    setMessage(
      data.status === "backup_rewritten" ? "Backup réecrit" : "Erreur",
    );
  };

  return (
    <div className="max-w-5xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Gestion des regex</h2>
      <p className="mb-4 text-sm text-slate-400">
        Collez ici un JSON d'objets regex. Le fichier actif est utilisé par le
        scanner.
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={24}
        className="l border border-slate-700 bg-slate-900 p-3 text-sm text-slate-100"
      />

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          onClick={savePatterns}
          className="rounded-xl bg-emerald-600 px-4 py-2 text-white"
        >
          Enregistrer dans le fichier actif
        </button>

        <button
          onClick={rewriteBackup}
          className="rounded-x1 bg-slate-700 px-4 py-2 text-white"
        >
          Réécrire le backup
        </button>
      </div>
      {message && <p className="mt-2 text-sm text-slate-300">{message}</p>}
    </div>
  );
}
