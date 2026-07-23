import axios from 'axios';
import toast from 'react-hot-toast';

const api = axios.create({
  baseURL: import.meta.env.VITE_CRM_API_URL || '',
  timeout: 60000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('cocoma_crm_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (err) => Promise.reject(err)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isAuthRequest =
      error.config?.url?.includes('/auth/login') ||
      error.config?.url?.includes('/auth/logout');
    const hasSession = !!localStorage.getItem('cocoma_crm_token');

    if (error.response?.status === 401 && !isAuthRequest && hasSession) {
      localStorage.removeItem('cocoma_crm_token');
      localStorage.removeItem('cocoma_crm_user');
      window.dispatchEvent(new CustomEvent('auth:logout'));
    } else if (error.response?.status === 500) {
      toast.error('Server error. Please try again.');
    }
    return Promise.reject(error);
  }
);

/* Convenience wrappers — unwrap the { status, data, meta } envelope. */
export const get = async <T = any>(url: string, params?: any): Promise<{ data: T; meta?: any }> => {
  const res = await api.get(url, { params });
  return { data: res.data.data as T, meta: res.data.meta };
};
export const post = async <T = any>(url: string, body?: any): Promise<T> => {
  const res = await api.post(url, body);
  return res.data.data as T;
};
export const put = async <T = any>(url: string, body?: any): Promise<T> => {
  const res = await api.put(url, body);
  return res.data.data as T;
};
export const patch = async <T = any>(url: string, body?: any): Promise<T> => {
  const res = await api.patch(url, body);
  return res.data.data as T;
};
export const del = async <T = any>(url: string): Promise<T> => {
  const res = await api.delete(url);
  return res.data.data as T;
};

export const errMsg = (err: any): string =>
  err?.response?.data?.message || err?.message || 'Something went wrong';

export default api;
