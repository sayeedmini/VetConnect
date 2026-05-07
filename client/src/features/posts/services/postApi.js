import apiClient from '../../../lib/apiClient';
import { getToken } from '../../auth/utils/auth';
import { API_BASE_URL } from '../../../lib/runtimeConfig';

const POSTS_API_BASE_URL = `${API_BASE_URL}/posts`;

const getAuthHeaders = () => {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const getPosts = async () => {
  const response = await apiClient.get(POSTS_API_BASE_URL, {
    headers: getAuthHeaders(),
  });

  return response.data;
};

export const createPost = async (payload) => {
  const response = await apiClient.post(POSTS_API_BASE_URL, payload, {
    headers: getAuthHeaders(),
  });

  return response.data;
};

export const updatePost = async (id, payload) => {
  const response = await apiClient.put(`${POSTS_API_BASE_URL}/${id}`, payload, {
    headers: getAuthHeaders(),
  });

  return response.data;
};
