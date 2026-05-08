import axios from 'axios';
import { API_BASE_URL } from '../../../lib/runtimeConfig';

const API = axios.create({
  baseURL: `${API_BASE_URL}/auth`,
  withCredentials: true,
});

export const registerUser = async (formData) => {
  const payload = {
    name: formData.name,
    email: formData.email,
    contactInfo: formData.contactInfo,
    password: formData.password,
    role: formData.role,
  };

  const { data } = await API.post('/register', payload);
  return data;
};

export const loginUser = async (formData) => {
  const payload = {
    email: formData.email,
    password: formData.password,
  };

  const { data } = await API.post('/login', payload);
  return data;
};

export const verifyTwoFactor = async (payload) => {
  const { data } = await API.post('/verify-2fa', payload);
  return data;
};

export const requestPasswordReset = async (email) => {
  const { data } = await API.post('/forgot-password', { email });
  return data;
};

export const validatePasswordResetToken = async (token) => {
  const { data } = await API.get(`/reset-password/${encodeURIComponent(token)}`);
  return data;
};

export const resetPassword = async ({ token, password }) => {
  const { data } = await API.post('/reset-password', { token, password });
  return data;
};

export const getMe = async () => {
  const { data } = await API.get('/me');
  return data;
};

export const logoutUser = async () => {
  const { data } = await API.post('/logout');
  return data;
};

export default API;
