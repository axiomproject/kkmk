import axios from 'axios';

// Define the API URL based on environment with proper API path
const baseURL = import.meta.env.PROD 
  ? 'https://kmfi.onrender.com'  // Add /api to production URL
  : 'http://localhost:5175/api';

// Create and export the axios instance with improved config
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5175/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Updated request interceptor
api.interceptors.request.use((config) => {
  // Remove /api prefix for upload URLs
  if (config.url?.includes('/uploads/')) {
    config.baseURL = (import.meta.env.VITE_API_URL || 'http://localhost:5175').replace('/api', '');
    // Strip any duplicate /api prefixes from URL
    config.url = config.url.replace('/api/', '/');
  }
  return config;
});

// Add request interceptor with error handling
api.interceptors.request.use(
  (config: any) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (import.meta.env.DEV) {
      console.log('Request:', config.method?.toUpperCase(), config.url);
    }
    return Promise.resolve(config);
  },
  (error: Error) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor with improved error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Log the detailed error information
    console.error('API Error:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      message: error.message,
      response: error.response?.data
    });

    // Handle specific error cases
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    } else if (error.code === 'ECONNABORTED') {
      return Promise.reject({ message: 'Request timed out. Please try again.' });
    } else if (!error.response) {
      return Promise.reject({ message: 'Network error. Please check your connection.' });
    }

    // Return a formatted error
    return Promise.reject({
      message: error.response?.data?.error || error.message,
      status: error.response?.status,
      data: error.response?.data
    });
  }
);

export default api;
