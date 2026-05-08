import apiClient from '../../../lib/apiClient';
import { API_BASE_URL } from '../../../lib/runtimeConfig';

const POSTS_API_BASE_URL = `${API_BASE_URL}/posts`;

export const getPosts = async () => {
  const response = await apiClient.get(POSTS_API_BASE_URL);
  return response.data;
};

export const createPost = async (payload) => {
  const response = await apiClient.post(POSTS_API_BASE_URL, payload);
  return response.data;
};

export const updatePost = async (id, payload) => {
  const response = await apiClient.put(`${POSTS_API_BASE_URL}/${id}`, payload);
  return response.data;
};

export const createComment = async (postId, payload) => {
  const response = await apiClient.post(`${POSTS_API_BASE_URL}/${postId}/comments`, payload);
  return response.data;
};

export const updateComment = async (postId, commentId, payload) => {
  const response = await apiClient.put(
    `${POSTS_API_BASE_URL}/${postId}/comments/${commentId}`,
    payload
  );

  return response.data;
};

export const deleteComment = async (postId, commentId) => {
  const response = await apiClient.delete(`${POSTS_API_BASE_URL}/${postId}/comments/${commentId}`);
  return response.data;
};
