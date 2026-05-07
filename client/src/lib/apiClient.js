import axios from 'axios';
import { logout } from '../features/auth/utils/auth';

const apiClient = axios.create();

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const authorizationHeader =
      error?.config?.headers?.Authorization || error?.config?.headers?.authorization;

    if (status === 401 && authorizationHeader) {
      logout();
    }

    return Promise.reject(error);
  }
);

export default apiClient;
