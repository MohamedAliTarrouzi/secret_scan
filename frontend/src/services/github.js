import api from "./api"

export const getInstallations = () => api.get("/github/installations")
export const getRepositories = (installationId) =>
    api.get("/github/repositories",{params:{"installation_id":installationId}})
export const scanGithubRepo = (installationId,owner,repo,branch="main") => 
    api.post("/github/scan",{installation_id:installationId, owner,repo,branch})
export const connectGithub = () => {window.location.href = "http://localhost:8000/api/github/connect"}