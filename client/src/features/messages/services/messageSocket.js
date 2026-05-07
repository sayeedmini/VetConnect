import { io } from 'socket.io-client';
import { getToken } from '../../auth/utils/auth';
import { SOCKET_ENABLED, SOCKET_URL } from '../../../lib/runtimeConfig';

let socketInstance = null;

export const getMessageSocket = () => {
  const token = getToken();

  if (!token || !SOCKET_ENABLED) {
    return null;
  }

  if (!socketInstance) {
    socketInstance = io(SOCKET_URL, {
      autoConnect: false,
      auth: { token },
    });
  } else {
    socketInstance.auth = { token };
  }

  return socketInstance;
};
