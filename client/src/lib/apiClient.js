import axios from 'axios';
import { logout } from '../features/auth/utils/auth';

const apiClient = axios.create({
  withCredentials: true,
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    if (status === 401) {
      logout();
    }

    return Promise.reject(error);
  }
);

export default apiClient;
