/**
 * Socket.IO manager for real-time workflow and heartbeat events.
 */
import type { Server as HTTPServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import type { AgentEvent } from "../../shared/workflow-runtime.js";

let io: SocketIOServer | null = null;

export function initSocketIO(httpServer: HTTPServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
    transports: ["websocket", "polling"],
  });

  io.on("connection", socket => {
    console.log(`[Socket] Client connected: ${socket.id}`);

    socket.on("disconnect", () => {
      console.log(`[Socket] Client disconnected: ${socket.id}`);
    });
  });

  console.log("[Socket] Socket.IO initialized");
  return io;
}

export function getSocketIO(): SocketIOServer | null {
  return io;
}

export function emitEvent(event: AgentEvent): void {
  if (io) {
    io.emit("agent_event", event);
  }
}
