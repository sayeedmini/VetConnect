import { io } from 'socket.io-client';
import { SOCKET_ENABLED, SOCKET_URL } from '../../../lib/runtimeConfig';

let socketInstance = null;

export const getMessageSocket = () => {
  if (!SOCKET_ENABLED) {
    return null;
  }

  if (!socketInstance) {
    socketInstance = io(SOCKET_URL, {
      autoConnect: false,
      withCredentials: true,
    });
  }

  return socketInstance;
};
