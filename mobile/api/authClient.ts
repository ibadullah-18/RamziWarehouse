// ==========================================================================
// GrandWall Mobile - Auth Client
// "10 dÉ™qiqÉ™dÉ™n sonra login-É™ atma" problemini bu fayl hÉ™ll edir:
// access token bitÉ™ndÉ™ (401) tÉ™tbiq Ä°STÄ°FADÆÃ‡Ä°YÆ GÃ–RÃœNMÆDÆN refresh edir.
// YalnÄ±z refresh token da (backend-dÉ™ 45 gÃ¼n sliding) etibarsÄ±zdÄ±rsa
// onda login sÉ™hifÉ™sinÉ™ yÃ¶nlÉ™ndirir.
//
// TODO: baseURL-i Ã¶z backend Ã¼nvanÄ±nla É™vÉ™z et.
// npm install axios expo-secure-store
// ==========================================================================

import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import * as SecureStore from "expo-secure-store";

const ACCESS_TOKEN_KEY = "gw_access_token";
const REFRESH_TOKEN_KEY = "gw_refresh_token";

export const apiClient = axios.create({
  baseURL: "https://TODO-oz-backend-unvanin.example.com/api",
  timeout: 15000,
});

let isRefreshing = false;
let pendingQueue: Array<(token: string | null) => void> = [];

function resolveQueue(token: string | null) {
  pendingQueue.forEach((cb) => cb(token));
  pendingQueue = [];
}

export async function getAccessToken() {
  return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
}

export async function setTokens(accessToken: string, refreshToken: string) {
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
}

export async function clearTokens() {
  await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
}

// Login/logout ekranÄ±na yÃ¶nlÉ™ndirmÉ™k Ã¼Ã§Ã¼n - App baÅŸlanÄŸÄ±cÄ±nda tÉ™yin et
let onSessionExpired: (() => void) | null = null;
export function registerSessionExpiredHandler(handler: () => void) {
  onSessionExpired = handler;
}

apiClient.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await getAccessToken();
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;

    if (error.response?.status !== 401 || !original || original._retry) {
      return Promise.reject(error);
    }

    original._retry = true;

    if (isRefreshing) {
      // eyni anda bir neÃ§É™ sorÄŸu 401 alsa, hamÄ±sÄ± TEK refresh-i gÃ¶zlÉ™sin
      return new Promise((resolve, reject) => {
        pendingQueue.push((newToken) => {
          if (!newToken) return reject(error);
          original.headers = original.headers ?? {};
          original.headers.Authorization = `Bearer ${newToken}`;
          resolve(apiClient(original));
        });
      });
    }

    isRefreshing = true;
    try {
      const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
      if (!refreshToken) throw new Error("refresh token yoxdur");

      const { data } = await axios.post(`${apiClient.defaults.baseURL}/auth/refresh`, {
        refreshToken,
      });

      await setTokens(data.accessToken, data.refreshToken);
      resolveQueue(data.accessToken);

      original.headers = original.headers ?? {};
      original.headers.Authorization = `Bearer ${data.accessToken}`;
      return apiClient(original);
    } catch (refreshError) {
      resolveQueue(null);
      await clearTokens();
      // YALNIZ burada - É™sl "lisenziya/sessiya bitib" hadisÉ™si
      onSessionExpired?.();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);
