import axios from 'axios';

// Define the API URL based on environment with proper fallbacks
const baseURL = import.meta.env.PROD 
  ? 'https://kmfi.onrender.com'
  : import.meta.env.VITE_API_URL || 'http://localhost:5175/api';

// Create and export the axios instance with improved config
const api = axios.create({
  baseURL,
  withCredentials: true,
  timeout: 15000, // 15 second timeout
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Add request interceptor with error handling
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Log outgoing requests in development
    if (import.meta.env.DEV) {
      console.log('Request:', config.method?.toUpperCase(), config.url);
    }
    return config;
  },
  (error) => {
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
