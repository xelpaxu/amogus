import { io } from "socket.io-client";

const URL = import.meta.env.VITE_GAME_SERVER_URL;

export const socket = io(URL, {
  transports: ["websocket", "polling"],
  secure: true,
  forceNew: true,
  reconnection: true
});