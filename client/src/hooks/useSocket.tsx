import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

export function useSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const newSocket = io(window.location.origin, {
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      console.log('Socket connected with id:', newSocket.id);
      setSocket(newSocket);
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  return socket;
}
