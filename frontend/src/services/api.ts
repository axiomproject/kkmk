import api from '../config/axios';

let requestCache: { [key: string]: { data: any; timestamp: number } } = {};
const CACHE_DURATION = 5000; // 5 seconds cache

// Add request interceptor to implement caching
api.interceptors.request.use(async (config) => {
  const cacheKey = `${config.method}-${config.url}`;
  const cached = requestCache[cacheKey];
  
  if (config.method === 'get' && cached) {
    const now = Date.now();
    if (now - cached.timestamp < CACHE_DURATION) {
      // Return cached data
      return Promise.reject({
        response: { data: cached.data },
        __CACHE: true
      });
    }
  }
  
  return config;
});

// Add response interceptor to cache responses
api.interceptors.response.use(
  (response) => {
    // Cache successful GET requests
    if (response.config.method === 'get') {
      const cacheKey = `${response.config.method}-${response.config.url}`;
      requestCache[cacheKey] = {
        data: response.data,
        timestamp: Date.now()
      };
    }
    return response;
  },
  (error) => {
    // Return cached data if this was a cache rejection
    if (error.__CACHE) {
      return Promise.resolve({ data: error.response.data });
    }
    return Promise.reject(error);
  }
);

export const scholarApi = {
  getAllScholars: async () => {
    const response = await api.get('/scholars');
    return response.data;
  },

  getScholarById: async (id: number) => {
    const response = await api.get(`/scholars/${id}`);
    return response.data;
  },

  getScholarDetails: async (id: string) => {
    const response = await api.get(`/scholars/${id}`);
    return response.data;
  }
};
