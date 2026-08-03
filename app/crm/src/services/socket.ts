import { io, Socket } from 'socket.io-client';

/**
 * One shared Socket.IO connection for the whole CRM tab.
 *
 * Deliberately a module singleton rather than per-component: React StrictMode
 * mounts effects twice in development, and a connection per component would
 * open (and leak) a socket on every mount. Components subscribe to events;
 * they never own the connection.
 */

let socket: Socket | null = null;

const url = (): string => {
  // Same origin as the REST API. In dev that is the Vite proxy target; in
  // production it is whatever VITE_CRM_API_URL points at.
  const base = import.meta.env.VITE_CRM_API_URL || '';
  return base || window.location.origin;
};

export const getSocket = (): Socket | null => {
  const token = localStorage.getItem('cocoma_crm_token');
  // No session → no socket. The server would reject the handshake anyway, and
  // retrying it forever produces a console full of auth errors on the login page.
  if (!token) return null;

  if (socket) {
    // The token can change under us (re-login in another tab). Reconnect with
    // the new one rather than staying authenticated as the previous user.
    if ((socket.auth as any)?.token !== token) {
      socket.disconnect();
      socket = null;
    } else {
      return socket;
    }
  }

  socket = io(url(), {
    path: '/crm/socket.io',
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    // Backs off to 5s rather than hammering a server that is restarting.
    reconnectionDelayMax: 5000,
    reconnectionAttempts: Infinity,
  });

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

// A logout in any tab invalidates the token this socket authenticated with.
window.addEventListener('auth:logout', disconnectSocket);
