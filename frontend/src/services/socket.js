import { io } from 'socket.io-client';

let socket = null;

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export const connectSocket = () => {
  if (!socket) {
    socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
  }
  return socket;
};

export const joinMatchRoom = (matchId) => {
  if (socket) socket.emit('joinMatch', matchId);
};

export const leaveMatchRoom = (matchId) => {
  if (socket) socket.emit('leaveMatch', matchId);
};

export const onScoreUpdate = (callback) => {
  if (socket) socket.on('scoreUpdate', callback);
};

export const offScoreUpdate = () => {
  if (socket) socket.off('scoreUpdate');
};

export const disconnectSocket = () => {
  if (socket) { socket.disconnect(); socket = null; }
};

export const getSocket = () => socket;
