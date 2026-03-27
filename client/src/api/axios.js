import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
});

// Attach JWT to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Global response error handler
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status;
    const url = err.config?.url || '';
    const isLoginRequest = url.includes('/auth/login');

    if (status === 401 && !isLoginRequest) {
      const hadToken = Boolean(localStorage.getItem('token'));
      localStorage.removeItem('token');
      if (hadToken) {
        try {
          sessionStorage.setItem('session_expired', '1');
          sessionStorage.setItem('post_login_redirect', window.location.pathname + window.location.search);
        } catch { }
      }
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export default api;
