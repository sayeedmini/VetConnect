import axios from 'axios';
import { getToken } from '../../auth/utils/auth';

const API_BASE_URL = 'http://localhost:5000/api/messages';

const getAuthHeaders = () => {
  const token = getToken();

  return token
    ? {
        Authorization: `Bearer ${token}`,
      }
    : {};
};

export const getMyConversations = async () => {
  const response = await axios.get(`${API_BASE_URL}/my`, {
    headers: getAuthHeaders(),
  });

  return response.data;
};

export const getConversationByAppointment = async (appointmentId) => {
  const response = await axios.get(`${API_BASE_URL}/appointments/${appointmentId}`, {
    headers: getAuthHeaders(),
  });

  return response.data;
};

export const sendMessage = async (appointmentId, payload) => {
  const response = await axios.post(`${API_BASE_URL}/appointments/${appointmentId}`, payload, {
    headers: getAuthHeaders(),
  });

  return response.data;
};

export const markConversationAsRead = async (appointmentId) => {
  const response = await axios.patch(
    `${API_BASE_URL}/appointments/${appointmentId}/read`,
    {},
    {
      headers: getAuthHeaders(),
    }
  );

  return response.data;
};
