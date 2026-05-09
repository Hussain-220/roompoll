import { useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';

let socketInstance = null;

export const useSocket = () => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!socketInstance) {
      // Get socket URL from environment or construct from current origin
      const socketUrl = import.meta.env.VITE_SOCKET_URL || 
        (import.meta.env.PROD ? window.location.origin : 'http://localhost:5000');
      
      console.log('🔌 Connecting to socket at:', socketUrl);
      
      socketInstance = io(socketUrl, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5,
        auth: { token: localStorage.getItem('roompoll_token') }
      });

      socketInstance.on('connect_error', (err) => {
        console.error('❌ Socket connection error:', err);
      });

      socketInstance.on('error', (err) => {
        console.error('❌ Socket error:', err);
      });
    }

    setSocket(socketInstance);

    const onConnect = () => {
      console.log('✅ Socket connected');
      setConnected(true);
    };
    const onDisconnect = () => {
      console.log('⚠️ Socket disconnected');
      setConnected(false);
    };

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
    if (!socketInstance) {
      console.warn('⚠️ Socket not initialized, cannot emit:', event);
      return;
    }
    if (!socketInstance.connected) {
      console.warn('⚠️ Socket not connected, cannot emit:', event);
      return;
    }
    socketInstance.emit(event, data);
  }, []);

  return { socket, connected, subscribe, emit };
};
