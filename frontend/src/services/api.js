import axios from "axios"

const api = axios.create({
    baseURL: "http://localhost:8000/api",
})

export const runScan = (target) => api.post("/scan",{target})
export const getHistory = () => api.get("/history")

export default api
