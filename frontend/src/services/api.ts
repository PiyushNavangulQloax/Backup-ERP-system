import axios from 'axios';

let rawBase = (import.meta.env.VITE_API_BASE_URL || '/api/v1').trim().replace(/\/+$/, '');
if (!rawBase.endsWith('/api/v1')) {
  rawBase = `${rawBase}/api/v1`;
}
export const API_BASE_URL = rawBase;

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => {
    // If encapsulated in { success: true, data: ... }, extract data
    if (response.data && response.data.success !== undefined && response.data.data !== undefined) {
      return response.data;
    }
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('erp_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const downloadFile = async (endpoint: string, defaultFilename: string) => {
  const token = localStorage.getItem('access_token');
  const cleanEndpoint = endpoint.replace(/^\/api\/v1\/?/, '').replace(/^\//, '');
  const urlPath = API_BASE_URL.startsWith('http')
    ? `${API_BASE_URL.replace(/\/$/, '')}/${cleanEndpoint}`
    : `/api/v1/${cleanEndpoint}`;
  const response = await fetch(urlPath, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) {
    throw new Error(`Download failed: ${response.statusText}`);
  }
  const blob = await response.blob();
  const objectUrl = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = defaultFilename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(objectUrl);
};

