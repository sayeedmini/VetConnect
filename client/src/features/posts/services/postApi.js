import axios from 'axios';
import { getToken } from '../../auth/utils/auth';

const API_BASE_URL = 'http://localhost:5000/api/posts';

const getAuthHeaders = () => {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const getPosts = async () => {
  const response = await axios.get(API_BASE_URL, {
    headers: getAuthHeaders(),
  });

  return response.data;
};

export const createPost = async (payload) => {
  const response = await axios.post(API_BASE_URL, payload, {
    headers: getAuthHeaders(),
  });

  return response.data;
};

export const updatePost = async (id, payload) => {
  const response = await axios.put(`${API_BASE_URL}/${id}`, payload, {
    headers: getAuthHeaders(),
  });

  return response.data;
};
