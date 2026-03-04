import axios, { AxiosError, type AxiosInstance } from "axios";

import { API_BASE_URL } from "@/lib/api/endpoints";
import { tokenStorage } from "@/lib/api/token";

const createBaseClient = (): AxiosInstance => {
  const client = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      Accept: "application/json",
    },
  });

  client.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => Promise.reject(error)
  );

  return client;
};

export const publicApi = createBaseClient();

export const authApi = createBaseClient();
let handlingUnauthorized = false;

authApi.interceptors.request.use((config) => {
  const token = tokenStorage.get();
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

authApi.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      tokenStorage.clear();
      if (typeof window !== "undefined") {
        const url = String(error.config?.url ?? "");
        const isAuthEndpoint =
          url.includes("/logout") ||
          url.includes("/validate-token") ||
          url.includes("/login");
        if (!isAuthEndpoint && !handlingUnauthorized) {
          handlingUnauthorized = true;
          window.dispatchEvent(new Event("auth:unauthorized"));
          window.setTimeout(() => {
            handlingUnauthorized = false;
          }, 250);
        }
      }
    }
    return Promise.reject(error);
  }
);
