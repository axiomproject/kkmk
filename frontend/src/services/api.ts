import axios from 'axios';

const API_BASE_URL = 'http://localhost:5175/api';

export const scholarApi = {
  getAllScholars: async () => {
    const response = await axios.get(`${API_BASE_URL}/scholars`);
    return response.data;
  },

  getScholarById: async (id: number) => {
    const response = await axios.get(`${API_BASE_URL}/scholars/${id}`);
    return response.data;
  },

  getScholarDetails: async (id: string) => {
    const response = await axios.get(`${API_BASE_URL}/scholars/${id}`);
    return response.data;
  }
};
