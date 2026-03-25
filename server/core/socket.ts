/**
 * Socket.IO Manager — Real-time event broadcasting
 */
import { Server as SocketIOServer } from 'socket.io';
import type { Server as HTTPServer } from 'http';

let io: SocketIOServer | null = null;

export function initSocketIO(httpServer: HTTPServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
  });

  io.on('connection', (socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);

    socket.on('disconnect', () => {
      console.log(`[Socket] Client disconnected: ${socket.id}`);
    });
  });

  console.log('[Socket] Socket.IO initialized');
  return io;
}

export function getSocketIO(): SocketIOServer | null {
  return io;
}

/**
 * Emit typed agent events
 */
export type AgentEvent =
  | { type: 'stage_change'; workflowId: string; stage: string }
  | { type: 'agent_active'; agentId: string; action: string; workflowId?: string }
  | { type: 'message_sent'; workflowId: string; from: string; to: string; stage: string; preview: string; timestamp: string }
  | { type: 'score_assigned'; workflowId: string; taskId: number; workerId: string; score: number }
  | { type: 'task_update'; workflowId: string; taskId: number; workerId: string; status: string }
  | { type: 'workflow_complete'; workflowId: string; summary: string }
  | { type: 'workflow_error'; workflowId: string; error: string };

export function emitEvent(event: AgentEvent): void {
  if (io) {
    io.emit('agent_event', event);
  }
}
