import React, { useState, useEffect } from "react";
import {
  Code2,
  GitBranch,
  FileArchive,
  FolderOpen,
  FileText,
  Play,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { runScan } from "../services/api";
import {
  getGithubMe,
  getGithubRepositories,
  scanGithubRepo,
  connectGithub,
  disconnectGithub,
} from "../services/github";

// FastAPI/Pydantic validation errors return `detail` as an array of
// {type, loc, msg, input} objects instead of a plain string (this is what
// you get on a 422). Rendering that array directly as a React child crashes
// with "Objects are not valid as a React child". This normalizes any error
// shape (string detail, array of pydantic errors, plain Error, etc.) into a
// safe string before it ever reaches JSX.
function extractErrorMessage(err) {
  const detail = err?.response?.data?.detail;

  if (typeof detail === "string") return detail;

  if (Array.isArray(detail)) {
    return detail
      .map((d) => (typeof d === "string" ? d : d?.msg || JSON.stringify(d)))
      .join("; ");
  }

  if (detail && typeof detail === "object") {
    return detail.msg || JSON.stringify(detail);
  }

  return err?.message || String(err);
}

export default function SubmissionPage({ onScanCompleted }) {
  const [mode, setMode] = useState("code");
  const [code, setCode] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [zipFile, setZipFile] = useState(null);
  const [multiFiles, setMultiFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [githubPat, setGithubPat] = useState("");

  const [githubConnected, setGithubConnected] = useState(false);
  const [checkingGithub, setCheckingGithub] = useState(false);
  const [githubRepos, setGithubRepos] = useState([]);
  const [selectedGithubRepo, setSelectedGithubRepo] = useState(null);
  const [githubBranch, setGithubBranch] = useState("main");
  const [loadingGithubRepos, setLoadingGithubRepos] = useState(false);

  const modes = [
    {
      id: "code",
      label: "Paste Code",
      description: "Analyze source code directly",
      icon: Code2,
    },
    {
      id: "repository",
      label: "Repository",
      description: "Scan a public or private Git repository",
      icon: GitBranch,
    },
    {
      id: "zip",
      label: "Upload ZIP",
      description: "Scan a local project archive",
      icon: FileArchive,
    },
    {
      id: "folder",
      label: "Scan Folder",
      description: "Select an entire local folder",
      icon: FolderOpen,
    },
    {
      id: "files",
      label: "Select Files",
      description: "Pick specific files to scan",
      icon: FileText,
    },
  ];

  // Reset local file selection states when changing modes
  const handleModeChange = (newMode) => {
    setMode(newMode);
    setError(null);
    setZipFile(null);
    setMultiFiles([]);
    setGithubPat("");
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("github_connected") === "true") {
      setMode("repository");
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  useEffect(() => {
    if (mode !== "repository") return;

    setCheckingGithub(true);
    setError(null);

    getGithubMe()
      .then((res) => {
        setGithubConnected(!!res.data.connected);
      })
      .catch(() => {
        setGithubConnected(false);
      })
      .finally(() =>setCheckingGithub(false));
  }, [mode]);

  useEffect(() => {
    if (!githubConnected) {
      setGithubRepos([]);
      setSelectedGithubRepo(null);
      return;
    }

    setLoadingGithubRepos(true);
    setError(null);

    getGithubRepositories()
      .then((res) => {
        setGithubRepos(res.data || []);
        setSelectedGithubRepo(null);
      })
      .catch((err) => setError(extractErrorMessage(err)))
      .finally(() => setLoadingGithubRepos(false));
  }, [githubConnected]);

  useEffect(() => {
    if (selectedGithubRepo) {
      setGithubBranch(selectedGithubRepo.default_branch || "main");
    }
  }, [selectedGithubRepo]);

  const validate = () => {
    if (mode === "code") return code.trim().length > 0;
    if (mode === "repository") {
      return repoUrl.trim().length > 5 || !!selectedGithubRepo;
    }
    if (mode === "zip") return zipFile instanceof File;
    if (mode === "folder" || mode === "files") return multiFiles.length > 0;
    return false;
  };

  const handleDisconnect = async () => {
    try {
      await disconnectGithub();
      setGithubConnected(false);
      setGithubRepos([]);
      setSelectedGithubRepo(null);
    } catch (err) {
      setError("Failed to disconnect GitHub.");
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!validate()) {
      setError(
        mode === "repository"
          ? "Please enter a repository URL or connect GitHub and select a repository."
          : "Please provide valid source input before scanning.",
      );
      return;
    }

    setLoading(true);

    try {
      let json;

      if (mode === "repository" && selectedGithubRepo) {
        const resp = await scanGithubRepo(
          selectedGithubRepo.owner,
          selectedGithubRepo.name,
          githubBranch,
        );
        json = resp.data;
      } else if (mode === "folder" || mode === "files") {
        const fd = new FormData();
        multiFiles.forEach((file) => {
          fd.append("files", file, file.webkitRelativePath || file.name);
        });

        const resp = await fetch(
          `${import.meta.env.VITE_API_URL || "http://localhost:8000"}/api/scan/upload-multiple`,
          { method: "POST", body: fd },
        );

        json = await resp.json();
        if (!resp.ok) {
          throw { response: { data: json } };
        }
      } else if (mode === "zip") {
        const fd = new FormData();
        fd.append("file", zipFile);

        const resp = await fetch(
          `${import.meta.env.VITE_API_URL || "http://localhost:8000"}/api/scan/upload`,
          { method: "POST", body: fd },
        );

        json = await resp.json();
        if (!resp.ok) {
          throw { response: { data: json } };
        }
      } else {
        const payload =
          mode === "code"
            ? { target: "inline", content: code }
            : { target: repoUrl, github_token: githubPat || undefined };

        const resp = await runScan(payload);
        json = resp.data;
      }

      onScanCompleted?.(json);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
      setGithubPat("");
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl">
      {/* Header */}
      <div className="mb-8">
        <div className="mb-2 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10">
            <Code2 className="h-5 w-5 text-blue-400" />
          </div>

          <div>
            <h1 className="text-2xl font-semibold text-white">Run a Scan</h1>
            <p className="text-sm text-slate-400">
              Analyze your source code for exposed secrets and sensitive data.
            </p>
          </div>
        </div>
      </div>

      {/* Main Card */}
      <div className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-800/60 shadow-2xl">
        {/* Scan type selector */}
        <div className="border-b border-slate-700 p-5">
          <p className="mb-3 text-sm font-medium text-slate-300">
            Choose scan source
          </p>

          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
            {modes.map((item) => {
              const Icon = item.icon;
              const active = mode === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleModeChange(item.id)}
                  className={`group rounded-xl border p-4 text-left transition ${
                    active
                      ? "border-blue-500/60 bg-blue-500/10"
                      : "border-slate-700 bg-slate-900/50 hover:border-slate-600 hover:bg-slate-900"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                        active
                          ? "bg-blue-500/15 text-blue-400"
                          : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>

                    {active && (
                      <CheckCircle2 className="h-5 w-5 text-blue-400" />
                    )}
                  </div>

                  <p className="mt-3 font-medium text-white">{item.label}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    {item.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={onSubmit} className="p-5">
          {/* Code */}
          {mode === "code" && (
            <div>
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-slate-200">
                    Source code
                  </label>
                  <p className="mt-1 text-xs text-slate-500">
                    Paste the code you want the scanner to analyze.
                  </p>
                </div>

                <span className="rounded-md bg-slate-900 px-2 py-1 font-mono text-xs text-slate-500">
                  {code.length} chars
                </span>
              </div>

              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                rows={18}
                spellCheck={false}
                className="w-full resize-y rounded-xl border border-slate-700 bg-slate-950/70 p-4 font-mono text-sm leading-6 text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/10"
                placeholder={`Paste your source code here...\n\nExample:\nconst API_KEY = "your-secret-key";`}
              />
            </div>
          )}

          {/* Repository */}
          {mode === "repository" && (
            <div className="space-y-6">
              {/* Public repository */}
              <div>
                <label className="text-sm font-medium text-slate-200">
                  Public repository
                </label>
                <p className="mt-1 text-xs text-slate-500">
                  Enter a repository URL. To scan a <strong>private</strong>{" "}
                  repo you don't own via the GitHub App below, paste a personal
                  access token with <code>repo</code> scope — it's sent with
                  this request only and is never stored.
                </p>

                <div className="relative mt-3">
                  <GitBranch className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                  <input
                    type="url"
                    value={repoUrl}
                    onChange={(e) => {
                      setRepoUrl(e.target.value);
                      setSelectedGithubRepo(null);
                    }}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950/70 py-3 pl-12 pr-4 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/10"
                    placeholder="https://github.com/owner/repository"
                  />
                </div>

                <input
                  type="password"
                  autoComplete="off"
                  value={githubPat}
                  onChange={(e) => setGithubPat(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-2.5 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/10"
                  placeholder="Personal access token (optional, for private repos)"
                />
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-slate-700" />
                <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  or
                </span>
                <div className="h-px flex-1 bg-slate-700" />
              </div>

              {/* Private GitHub */}
              <div>
                <label className="text-sm font-medium text-slate-200">
                  Private GitHub repository
                </label>

                <p className="mt-1 text-xs text-slate-500">
                  Connect your GitHub account to scan repositories that require
                  authentication.
                </p>

                {checkingGithub ? (
                  <div className="mt-4 flex items-center gap-2 text-sm text-slate-400">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Checking GitHub connection...
                  </div>
                ) : !githubConnected ? (
                  <button
                    type="button"
                    onClick={connectGithub}
                    className="mt-4 rounded-xl bg-slate-700 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-600"
                  >
                    Connect GitHub
                  </button>
                ) : (
                  <div className="mt-4 space-y-4">
                    {/* Repository selector */}
                    {loadingGithubRepos ? (
                      <div className="flex items-center gap-2 text-sm text-slate-400">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading repositories...
                      </div>
                    ) : githubRepos.length === 0 ? (
                      <p className="text-sm text-slate-500">
                        No repositories found for this GitHub account.
                      </p>
                    ) : (
                      <div>
                        <label className="mb-2 block text-xs font-medium text-slate-400">
                          Repository
                        </label>

                        <select
                          value={selectedGithubRepo?.full_name ?? ""}
                          onChange={(e) => {
                            const repo = githubRepos.find(
                              (repo) => repo.full_name === e.target.value,
                            );

                            setSelectedGithubRepo(repo || null);
                            setRepoUrl("");
                            setGithubPat("");
                          }}
                          className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-blue-500/60"
                        >
                          <option value="">Select a repository...</option>

                          {githubRepos.map((repo) => (
                            <option key={repo.full_name} value={repo.full_name}>
                              {repo.full_name}
                              {repo.private ? " (private)" : ""}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Branch */}
                    {selectedGithubRepo && (
                      <div>
                        <label className="mb-2 block text-xs font-medium text-slate-400">
                          Branch
                        </label>

                        <input
                          type="text"
                          value={githubBranch}
                          onChange={(e) => setGithubBranch(e.target.value)}
                          className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-blue-500/60"
                          placeholder="main"
                        />
                      </div>
                    )}

                    {/* Disconnect */}
                    <button
                      type="button"
                      onClick={handleDisconnect}
                      className="text-xs text-slate-400 transition hover:text-red-400"
                    >
                      Disconnect GitHub
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ZIP */}
          {mode === "zip" && (
            <div>
              <div className="mb-2">
                <label className="text-sm font-medium text-slate-200">
                  Project ZIP file
                </label>
                <p className="mt-1 text-xs text-slate-500">
                  Upload a ZIP archive containing the project you want to scan.
                </p>
              </div>

              <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-slate-600 bg-slate-950/40 px-6 py-12 text-center transition hover:border-blue-500/50 hover:bg-blue-500/5">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-800">
                  <FileArchive className="h-6 w-6 text-slate-400" />
                </div>

                <p className="mt-4 text-sm font-medium text-slate-200">
                  {zipFile ? zipFile.name : "Choose a ZIP file"}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  {zipFile
                    ? `${Math.round(zipFile.size / 1024)} KB`
                    : "ZIP archives only"}
                </p>

                <input
                  type="file"
                  accept=".zip,application/zip"
                  onClick={(e) => (e.target.value = null)}
                  onChange={(e) => setZipFile(e.target.files?.[0] ?? null)}
                  className="hidden"
                />
              </label>
            </div>
          )}

          {/* Folder */}
          {mode === "folder" && (
            <div>
              <label className="text-sm font-medium text-slate-200">
                Local folder
              </label>
              <p className="mb-2 mt-1 text-xs text-slate-500">
                Select a folder — every file inside (recursively) will be
                scanned.
              </p>
              <input
                type="file"
                webkitdirectory="true"
                directory="true"
                multiple
                onClick={(e) => (e.target.value = null)}
                onChange={(e) =>
                  setMultiFiles(Array.from(e.target.files || []))
                }
                className="text-sm text-slate-300"
              />
              {multiFiles.length > 0 && (
                <p className="mt-2 text-xs text-slate-500">
                  {multiFiles.length} file(s) selected
                </p>
              )}
            </div>
          )}

          {/* Files */}
          {mode === "files" && (
            <div>
              <label className="text-sm font-medium text-slate-200">
                Individual files
              </label>
              <p className="mb-2 mt-1 text-xs text-slate-500">
                Hold Ctrl/Cmd to select multiple files.
              </p>
              <input
                type="file"
                multiple
                onClick={(e) => (e.target.value = null)}
                onChange={(e) =>
                  setMultiFiles(Array.from(e.target.files || []))
                }
                className="text-sm text-slate-300"
              />
              {multiFiles.length > 0 && (
                <ul className="mt-2 max-h-32 overflow-y-auto text-xs text-slate-500">
                  {multiFiles.map((f, i) => (
                    <li key={i}>{f.webkitRelativePath || f.name}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mt-5 flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/5 p-4">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />

              <div>
                <p className="text-sm font-medium text-red-300">Scan failed</p>
                <p className="mt-1 text-sm text-red-400/80">{error}</p>
              </div>
            </div>
          )}

          {/* Submit */}
          <div className="mt-6 flex items-center justify-between gap-4 border-t border-slate-700 pt-5">
            <p className="hidden text-xs text-slate-500 sm:block">
              The scanner will analyze the selected source for potential
              secrets.
            </p>

            <button
              type="submit"
              disabled={loading}
              className="ml-auto flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 font-medium text-white shadow-lg shadow-blue-900/20 transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Scanning...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Run Scan
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
