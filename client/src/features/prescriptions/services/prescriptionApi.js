import apiClient from '../../../lib/apiClient';
import { API_BASE_URL } from '../../../lib/runtimeConfig';

export const getPrescriptionByAppointment = async (appointmentId) => {
  const response = await apiClient.get(
    `${API_BASE_URL}/prescriptions/appointments/${appointmentId}`
  );

  return response.data;
};

export const savePrescriptionByAppointment = async (appointmentId, payload) => {
  const response = await apiClient.put(
    `${API_BASE_URL}/prescriptions/appointments/${appointmentId}`,
    payload
  );

  return response.data;
};

export const getMyPrescriptions = async (petName = '') => {
  const response = await apiClient.get(`${API_BASE_URL}/prescriptions/my`, {
    params: petName ? { petName } : {},
  });

  return response.data;
};
