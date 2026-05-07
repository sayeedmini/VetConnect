import axios from 'axios';
import { getToken } from '../../auth/utils/auth';
import { API_BASE_URL } from '../../../lib/runtimeConfig';

const PROFILE_API_BASE_URL = `${API_BASE_URL}/profile`;

const getAuthHeaders = () => {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const getMyProfile = async () => {
  const response = await axios.get(`${PROFILE_API_BASE_URL}/me`, {
    headers: getAuthHeaders(),
  });

  return response.data;
};

export const updateMyProfile = async (payload) => {
  const response = await axios.put(`${PROFILE_API_BASE_URL}/me`, payload, {
    headers: getAuthHeaders(),
  });

  return response.data;
};
