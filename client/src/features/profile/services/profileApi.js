import axios from 'axios';
import { getToken } from '../../auth/utils/auth';

const API_BASE_URL = 'http://localhost:5000/api/profile';

const getAuthHeaders = () => {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const getMyProfile = async () => {
  const response = await axios.get(`${API_BASE_URL}/me`, {
    headers: getAuthHeaders(),
  });

  return response.data;
};

export const updateMyProfile = async (payload) => {
  const response = await axios.put(`${API_BASE_URL}/me`, payload, {
    headers: getAuthHeaders(),
  });

  return response.data;
};
