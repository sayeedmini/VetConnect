import apiClient from '../../../lib/apiClient';
import { API_BASE_URL } from '../../../lib/runtimeConfig';

const APPOINTMENTS_API_BASE_URL = `${API_BASE_URL}/appointments`;

export const getAvailableSlots = async (clinicId, date, options = {}) => {
  const response = await apiClient.get(`${APPOINTMENTS_API_BASE_URL}/available-slots`, {
    params: {
      clinicId,
      date,
      ...(options.excludeAppointmentId ? { excludeAppointmentId: options.excludeAppointmentId } : {}),
    },
  });

  return response.data;
};

export const bookAppointment = async (payload) => {
  const response = await apiClient.post(APPOINTMENTS_API_BASE_URL, payload);
  return response.data;
};

export const getMyAppointments = async (status = '') => {
  const response = await apiClient.get(`${APPOINTMENTS_API_BASE_URL}/my`, {
    params: status ? { status } : {},
  });

  return response.data;
};

export const getAppointmentById = async (id) => {
  const response = await apiClient.get(`${APPOINTMENTS_API_BASE_URL}/${id}`);
  return response.data;
};

export const cancelAppointment = async (id) => {
  const response = await apiClient.patch(`${APPOINTMENTS_API_BASE_URL}/${id}/cancel`, {});
  return response.data;
};

export const rescheduleAppointment = async (id, payload) => {
  const response = await apiClient.patch(`${APPOINTMENTS_API_BASE_URL}/${id}/reschedule`, payload);
  return response.data;
};

export const completeAppointment = async (id) => {
  const response = await apiClient.patch(`${APPOINTMENTS_API_BASE_URL}/${id}/complete`, {});
  return response.data;
};
