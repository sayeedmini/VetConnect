import apiClient from '../../../lib/apiClient';
import { getToken } from '../../auth/utils/auth';
import { API_BASE_URL } from '../../../lib/runtimeConfig';

const getAuthHeaders = () => {
  const token = getToken();

  return token
    ? {
        Authorization: `Bearer ${token}`,
      }
    : {};
};

export const getPrescriptionByAppointment = async (appointmentId) => {
  const response = await apiClient.get(`${API_BASE_URL}/prescriptions/appointments/${appointmentId}`, {
    headers: getAuthHeaders(),
  });

  return response.data;
};

export const savePrescriptionByAppointment = async (appointmentId, payload) => {
  const response = await apiClient.put(
    `${API_BASE_URL}/prescriptions/appointments/${appointmentId}`,
    payload,
    {
      headers: getAuthHeaders(),
    }
  );

  return response.data;
};

export const getMyPrescriptions = async (petName = '') => {
  const response = await apiClient.get(`${API_BASE_URL}/prescriptions/my`, {
    params: petName ? { petName } : {},
    headers: getAuthHeaders(),
  });

  return response.data;
};
