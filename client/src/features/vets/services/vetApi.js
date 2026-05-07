import apiClient from '../../../lib/apiClient';
import { getToken } from '../../auth/utils/auth';
import { API_BASE_URL } from '../../../lib/runtimeConfig';

const VETS_API_BASE_URL = `${API_BASE_URL}/vets`;

const getAuthHeaders = () => {
  const token = getToken();

  return token
    ? {
        Authorization: `Bearer ${token}`,
      }
    : {};
};

export const getAllVets = async (filters = {}) => {
  const response = await apiClient.get(VETS_API_BASE_URL, { params: filters });
  return response.data;
};

export const getVetById = async (id) => {
  const response = await apiClient.get(`${VETS_API_BASE_URL}/${id}`);
  return response.data;
};

export const createVet = async (vetData) => {
  const response = await apiClient.post(VETS_API_BASE_URL, vetData, {
    headers: getAuthHeaders(),
  });
  return response.data;
};

export const updateVet = async (id, vetData) => {
  const response = await apiClient.put(`${VETS_API_BASE_URL}/${id}`, vetData, {
    headers: getAuthHeaders(),
  });
  return response.data;
};

export const deleteVet = async (id) => {
  const response = await apiClient.delete(`${VETS_API_BASE_URL}/${id}`, {
    headers: getAuthHeaders(),
  });
  return response.data;
};
