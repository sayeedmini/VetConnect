import { io } from 'socket.io-client';
import { getToken } from '../../auth/utils/auth';

const SOCKET_URL = 'http://localhost:5000';

let socketInstance = null;

export const getMessageSocket = () => {
  const token = getToken();

  if (!token) {
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
