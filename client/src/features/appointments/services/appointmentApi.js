import apiClient from '../../../lib/apiClient';
import { getToken } from '../../auth/utils/auth';
import { API_BASE_URL } from '../../../lib/runtimeConfig';

const APPOINTMENTS_API_BASE_URL = `${API_BASE_URL}/appointments`;

const getAuthHeaders = () => {
  const token = getToken();

  return token
    ? {
        Authorization: `Bearer ${token}`,
      }
    : {};
};

export const getAvailableSlots = async (clinicId, date, options = {}) => {
  const response = await apiClient.get(`${APPOINTMENTS_API_BASE_URL}/available-slots`, {
    params: {
      clinicId,
      date,
      ...(options.excludeAppointmentId ? { excludeAppointmentId: options.excludeAppointmentId } : {}),
    },
    headers: getAuthHeaders(),
  });

  return response.data;
};

export const bookAppointment = async (payload) => {
  const response = await apiClient.post(APPOINTMENTS_API_BASE_URL, payload, {
    headers: getAuthHeaders(),
  });

  return response.data;
};

export const getMyAppointments = async (status = '') => {
  const response = await apiClient.get(`${APPOINTMENTS_API_BASE_URL}/my`, {
    params: status ? { status } : {},
    headers: getAuthHeaders(),
  });

  return response.data;
};

export const getAppointmentById = async (id) => {
  const response = await apiClient.get(`${APPOINTMENTS_API_BASE_URL}/${id}`, {
    headers: getAuthHeaders(),
  });

  return response.data;
};

export const cancelAppointment = async (id) => {
  const response = await apiClient.patch(
    `${APPOINTMENTS_API_BASE_URL}/${id}/cancel`,
    {},
    {
      headers: getAuthHeaders(),
    }
  );

  return response.data;
};

export const rescheduleAppointment = async (id, payload) => {
  const response = await apiClient.patch(`${APPOINTMENTS_API_BASE_URL}/${id}/reschedule`, payload, {
    headers: getAuthHeaders(),
  });

  return response.data;
};

export const completeAppointment = async (id) => {
  const response = await apiClient.patch(
    `${APPOINTMENTS_API_BASE_URL}/${id}/complete`,
    {},
    {
      headers: getAuthHeaders(),
    }
  );

  return response.data;
};
