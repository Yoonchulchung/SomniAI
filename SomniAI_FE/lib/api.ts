/**
 * API Client
 * Axios instance with interceptors
 */

import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, // Send cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add token to Authorization header if exists
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Unauthorized - clear token and redirect to login
      localStorage.removeItem('token');
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  register: (email: string, password: string, username: string) =>
    api.post('/auth/register', { email, password, username }),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
};

// Description API
export const descriptionAPI = {
  getAll: () => api.get('/descriptions'),
  getById: (id: string) => api.get(`/descriptions/${id}`),
  create: (title: string, content: any) =>
    api.post('/descriptions', { title, content }),
  update: (id: string, title: string, content: any) =>
    api.put(`/descriptions/${id}`, { title, content }),
  publish: (id: string) => api.post(`/descriptions/${id}/publish`),
  unpublish: (id: string) => api.post(`/descriptions/${id}/unpublish`),
  delete: (id: string) => api.delete(`/descriptions/${id}`),
  getHistory: (id: string) => api.get(`/descriptions/${id}/history`),
};

export default api;
