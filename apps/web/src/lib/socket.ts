import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { WS_EVENTS } from '@repo/types';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';

export function useSocket(restaurantId: string | undefined, onOrderEvent: (event: string, data: any) => void) {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!restaurantId) return;

    const socket = io(SOCKET_URL);
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Connected to WebSocket server');
      socket.emit(WS_EVENTS.JOIN_RESTAURANT, restaurantId);
    });

    socket.on(WS_EVENTS.ORDER_CREATED, (data) => {
      onOrderEvent(WS_EVENTS.ORDER_CREATED, data);
    });

    socket.on(WS_EVENTS.ORDER_UPDATED, (data) => {
      onOrderEvent(WS_EVENTS.ORDER_UPDATED, data);
    });

    return () => {
      socket.disconnect();
    };
  }, [restaurantId, onOrderEvent]);

  return socketRef.current;
}
