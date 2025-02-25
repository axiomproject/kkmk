import axios from 'axios';

const baseURL = import.meta.env.PROD 
  ? 'https://kkmkpayatas.onrender.com/api'
  : 'http://localhost:5175/api';

const api = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

export default api;
