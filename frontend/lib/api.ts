import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { clearAccessToken, getAccessToken, setAccessToken } from './auth';
import { Profile } from './types';

const baseURL = `${process.env.NEXT_PUBLIC_API_URL}/api`;
const api = axios.create({ baseURL, withCredentials: true });
const refreshClient = axios.create({ baseURL, withCredentials: true });

let refreshRequest: Promise<string> | null = null;

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;

    if (error.response?.status !== 401 || !original || original._retry || original.url?.includes('/auth/refresh')) {
      return Promise.reject(error);
    }

    original._retry = true;

    try {
      refreshRequest ??= refreshClient.post('/auth/refresh').then((response) => {
        const token = response.data.accessToken as string;
        setAccessToken(token);
        return token;
      });

      const token = await refreshRequest;
      original.headers.Authorization = `Bearer ${token}`;
      return api(original);
    } catch (refreshError) {
      clearAccessToken();
      return Promise.reject(refreshError);
    } finally {
      refreshRequest = null;
    }
  }
);

export async function login(payload: { email: string; password: string }) {
  const response = await api.post('/auth/login', payload);
  setAccessToken(response.data.accessToken);
  return response.data;
}

export async function register(payload: { email: string; password: string; orgName: string }) {
  const response = await api.post('/auth/register', payload);
  setAccessToken(response.data.accessToken);
  return response.data;
}

export async function logout() {
  try {
    await api.post('/auth/logout');
  } finally {
    clearAccessToken();
  }
}

export async function restoreSession() {
  const response = await refreshClient.post('/auth/refresh');
  setAccessToken(response.data.accessToken);
  return response.data;
}

export async function getProfile() {
  const response = await api.get<Profile>('/auth/me');
  return response.data;
}

export default api;
