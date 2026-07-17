import axios from 'axios';
import toast from 'react-hot-toast';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  timeout: 60000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('cocoma_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (err) => Promise.reject(err)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Skip 401 handling for the login/logout requests themselves —
    // a 401 from the logout call would re-trigger logout in a loop
    const isAuthRequest =
      error.config?.url?.includes('/auth/login') ||
      error.config?.url?.includes('/auth/logout');
    const hasSession = !!localStorage.getItem('cocoma_token');

    if (error.response?.status === 401 && !isAuthRequest && hasSession) {
      localStorage.removeItem('cocoma_token');
      localStorage.removeItem('cocoma_user');
      // Dispatch a custom event so React Router handles navigation
      // without a full browser page refresh
      window.dispatchEvent(new CustomEvent('auth:logout'));
    } else if (error.response?.status === 500) {
      toast.error('Server error. Please try again.');
    }
    return Promise.reject(error);
  }
);

export default api;
