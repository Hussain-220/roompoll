import { useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';

let socketInstance = null;

export const useSocket = () => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!socketInstance) {
      socketInstance = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000', {
        transports: ['websocket'],
        auth: { token: localStorage.getItem('roompoll_token') }
      });
    }

    setSocket(socketInstance);

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    socketInstance.on('connect', onConnect);
    socketInstance.on('disconnect', onDisconnect);
    setConnected(socketInstance.connected);

    return () => {
      socketInstance.off('connect', onConnect);
      socketInstance.off('disconnect', onDisconnect);
    };
  }, []);

  const subscribe = useCallback((event, callback) => {
    if (!socketInstance) return () => {};
    socketInstance.on(event, callback);
    return () => {
      socketInstance.off(event, callback);
    };
  }, []);

  const emit = useCallback((event, data) => {
    if (!socketInstance) return;
    socketInstance.emit(event, data);
  }, []);

  return { socket, connected, subscribe, emit };
};
