import api from "./api"

export const connectGithub = () => {window.location.href = "http://localhost:8000/api/github/connect"}

export const getGithubMe = () => api.get("/github/me")
export const getGithubRepositories = () => api.get("/github/repositories")
export const scanGithubRepo = (owner, repo, branch = "main") =>
  api.post("/github/scan", { owner, repo, branch })
export const disconnectGithub = () => api.post("/github/logout")