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
    // Skip 401 handling for the login request itself
    const isLoginRequest = error.config?.url?.includes('/auth/login');

    if (error.response?.status === 401 && !isLoginRequest) {
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
