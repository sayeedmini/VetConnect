import axios from 'axios';
import { getToken } from '../../auth/utils/auth';

const API_BASE_URL = 'http://localhost:5000/api';

const getAuthHeaders = () => {
  const token = getToken();

  return token
    ? {
        Authorization: `Bearer ${token}`,
      }
    : {};
};

export const getPrescriptionByAppointment = async (appointmentId) => {
  const response = await axios.get(`${API_BASE_URL}/prescriptions/appointments/${appointmentId}`, {
    headers: getAuthHeaders(),
  });

  return response.data;
};

export const savePrescriptionByAppointment = async (appointmentId, payload) => {
  const response = await axios.put(
    `${API_BASE_URL}/prescriptions/appointments/${appointmentId}`,
    payload,
    {
      headers: getAuthHeaders(),
    }
  );

  return response.data;
};

export const getMyPrescriptions = async (petName = '') => {
  const response = await axios.get(`${API_BASE_URL}/prescriptions/my`, {
    params: petName ? { petName } : {},
    headers: getAuthHeaders(),
  });

  return response.data;
};
