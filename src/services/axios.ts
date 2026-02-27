import axios from "axios";
import { getAdminToken, clearAdminSession } from "./auth";

/**
 * ✅ Instância principal do Axios
 */
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true, // mantém caso use cookies no futuro
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(
  (config) => {
    if (typeof window === "undefined") return config;

    const token = getAdminToken();

    if (token) {
      config.headers = config.headers ?? {};
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error),
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (typeof window === "undefined") {
      return Promise.reject(error);
    }

    const status = error.response?.status;
    const message = error.response?.data?.message;
    const url = error.config?.url; //debug
    const method = error.config?.method; //debug
    const msg = error.response?.data?.message; //debug

    if (status === 401) {
      console.log("[ADMIN 401]", { method, url, msg });
      console.log("[TOKEN ATUAL]", sessionStorage.getItem("adminToken"));
    }

    const isAuthError =
      status === 401 ||
      message === "Token inválido" ||
      message === "Login expirou";

    if (isAuthError) {
      clearAdminSession();

      if (window.location.pathname !== "/") {
        window.location.href = "/";
      }
    }

    return Promise.reject(error);
  },
);

export default api;
