import socket from "socket.io-client";

let socketInstance = null;

/**
 * Always creates a FRESH socket for each project.
 * The old singleton pattern was the root cause of messages not working
 * after joining a project via invite code — the old socket stayed connected
 * to the previous project's room and silently dropped events.
 */
export const initializeSocket = (projectId) => {
  // Tear down any existing connection before creating a new one
  if (socketInstance) {
    socketInstance.removeAllListeners();
    socketInstance.disconnect();
    socketInstance = null;
  }

  socketInstance = socket(import.meta.env.VITE_API_URL, {
    auth:  { token: localStorage.getItem("token") },
    query: { projectId },
    reconnection:        true,
    reconnectionAttempts: 5,
    reconnectionDelay:   1000,
  });

  socketInstance.on("connect_error", (err) => {
    console.error("Socket connect error:", err.message);
  });

  return socketInstance;
};

export const receiveMessage = (eventName, cb) => {
  if (socketInstance) socketInstance.on(eventName, cb);
};

export const sendMessage = (eventName, data) => {
  if (socketInstance) socketInstance.emit(eventName, data);
};

/** Call this when unmounting the Project screen */
export const disconnectSocket = () => {
  if (socketInstance) {
    socketInstance.removeAllListeners();
    socketInstance.disconnect();
    socketInstance = null;
  }
};