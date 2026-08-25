import axios from "axios"

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : "http://localhost:8000/api",
    withCredentials: true,
})

export const runScan = (payload) => api.post("/scan", payload)
export const getHistory = () => api.get("/history")
export const deleteHistoryItem = (scanId) => api.delete(`/history/${scanId}`)
export const deleteAllHistory = () => api.delete("/history")

export default api
