import apiClient from '../../../lib/apiClient';
import { API_BASE_URL } from '../../../lib/runtimeConfig';

const PROFILE_API_BASE_URL = `${API_BASE_URL}/profile`;

export const getMyProfile = async () => {
  const response = await apiClient.get(`${PROFILE_API_BASE_URL}/me`);
  return response.data;
};

export const updateMyProfile = async (payload) => {
  const response = await apiClient.put(`${PROFILE_API_BASE_URL}/me`, payload);
  return response.data;
};

export const regenerateBackupCodes = async (payload) => {
  const response = await apiClient.post(`${PROFILE_API_BASE_URL}/me/backup-codes/regenerate`, payload);
  return response.data;
};
