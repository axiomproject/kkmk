import axios from 'axios';

// Create a custom instance of axios with common configuration
const api = axios.create({
  // Update the baseURL to match your backend server
  // If your server is at http://localhost:5000, use:
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  // Adjust the timeout as needed
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include the auth token in all requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Log outgoing requests for debugging
    console.log('API Request:', {
      method: config.method,
      url: config.baseURL + config.url,
      data: config.data
    });
    return config;
  },
  (error) => Promise.reject(error)
);

// Add response interceptor for better error handling
api.interceptors.response.use(
  (response) => {
    // Log successful responses for debugging
    console.log('API Response:', {
      status: response.status,
      url: response.config.url,
      data: response.data
    });
    return response;
  },
  (error) => {
    // Log error responses for debugging
    if (error.response) {
      console.error('API Error Response:', {
        status: error.response.status,
        url: error.config.url,
        data: error.response.data
      });
      
      // Handle 401 Unauthorized responses
      if (error.response.status === 401) {
        // Redirect to login page if token is invalid or expired
        if (window.location.pathname !== '/login') {
          localStorage.removeItem('token');
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
