import apiClient from '../../../lib/apiClient';
import { API_BASE_URL } from '../../../lib/runtimeConfig';

const MESSAGES_API_BASE_URL = `${API_BASE_URL}/messages`;

export const getMyConversations = async () => {
  const response = await apiClient.get(`${MESSAGES_API_BASE_URL}/my`);
  return response.data;
};

export const getConversationByAppointment = async (appointmentId) => {
  const response = await apiClient.get(`${MESSAGES_API_BASE_URL}/appointments/${appointmentId}`);
  return response.data;
};

export const sendMessage = async (appointmentId, payload) => {
  const response = await apiClient.post(
    `${MESSAGES_API_BASE_URL}/appointments/${appointmentId}`,
    payload
  );

  return response.data;
};

export const markConversationAsRead = async (appointmentId) => {
  const response = await apiClient.patch(
    `${MESSAGES_API_BASE_URL}/appointments/${appointmentId}/read`,
    {}
  );

  return response.data;
};
