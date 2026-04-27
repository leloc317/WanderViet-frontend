import { useEffect } from "react";
import { useSocketContext } from "../context/SocketContext";

/**
 * useSocket(event, handler)
 * Subscribe to a socket event. Auto-cleans up on unmount.
 *
 * Usage:
 *   useSocket("booking:new", (data) => { ... });
 *   useSocket("unit:status", (data) => { ... });
 */
export default function useSocket(event, handler) {
  const { socket } = useSocketContext();

  useEffect(() => {
    if (!socket || !event || !handler) return;
    socket.on(event, handler);
    return () => socket.off(event, handler);
  }, [socket, event, handler]);
}