import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token") || sessionStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Bỏ hoàn toàn logic redirect 401
// AuthContext.fetchMe() tự xử lý khi token hết hạn
api.interceptors.response.use(
  (res) => res,
  (err) => Promise.reject(err)
);

export default api;