import { useEffect, useRef, useState } from 'react';
import { getSocket } from '@/services/socket';

/**
 * Subscribe to one server event for the lifetime of a component.
 *
 * The handler is held in a ref so that a caller passing an inline arrow
 * function — which is every caller — does not detach and re-attach the
 * listener on every render. Re-subscribing that often drops events that
 * arrive in the gap.
 */
export const useRealtimeEvent = <T = any>(event: string, handler: (payload: T) => void) => {
  const ref = useRef(handler);
  ref.current = handler;

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const fn = (payload: T) => ref.current(payload);
    socket.on(event, fn);
    return () => { socket.off(event, fn); };
  }, [event]);
};

/**
 * Connection state, for showing the agent whether the inbox is actually live.
 *
 * This is the CRM's own link to the server — not the customer's WhatsApp
 * presence, which neither Twilio nor Meta exposes. When it is false, replies
 * are still delivered and stored; they just will not appear until reconnect,
 * which is exactly what the agent needs to know.
 */
export const useRealtimeStatus = () => {
  const [connected, setConnected] = useState<boolean>(() => Boolean(getSocket()?.connected));

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const on = () => setConnected(true);
    const off = () => setConnected(false);
    socket.on('connect', on);
    socket.on('disconnect', off);
    socket.on('connect_error', off);
    setConnected(socket.connected);
    return () => {
      socket.off('connect', on);
      socket.off('disconnect', off);
      socket.off('connect_error', off);
    };
  }, []);

  return connected;
};

/** Join/leave a conversation room so only the open thread receives its traffic. */
export const useThreadRoom = (key: string | null) => {
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !key) return;
    const join = () => socket.emit('thread:join', key);
    join();
    // Rejoin after a reconnect — room membership lives on the server and is
    // lost when the socket drops.
    socket.on('connect', join);
    return () => {
      socket.off('connect', join);
      socket.emit('thread:leave', key);
    };
  }, [key]);
};
