import apiClient from '../../../lib/apiClient';
import { API_BASE_URL } from '../../../lib/runtimeConfig';

export const getClinicReviews = async (clinicId, includeRejected = false) => {
  const response = await apiClient.get(`${API_BASE_URL}/clinics/${clinicId}/reviews`, {
    params: includeRejected ? { includeRejected: true } : {},
  });

  return response.data;
};

export const getMyClinicReview = async (clinicId) => {
  const response = await apiClient.get(`${API_BASE_URL}/clinics/${clinicId}/reviews/me`);
  return response.data;
};

export const createClinicReview = async (clinicId, payload) => {
  const response = await apiClient.post(`${API_BASE_URL}/clinics/${clinicId}/reviews`, payload);
  return response.data;
};

export const updateReview = async (reviewId, payload) => {
  const response = await apiClient.patch(`${API_BASE_URL}/reviews/${reviewId}`, payload);
  return response.data;
};

export const moderateReview = async (reviewId, payload) => {
  const response = await apiClient.patch(`${API_BASE_URL}/reviews/${reviewId}/moderate`, payload);
  return response.data;
};
