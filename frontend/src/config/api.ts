import api from '../config/axios';

const API_BASE_URL = 'http://localhost:5175/api';

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
