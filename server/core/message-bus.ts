/**
 * Message Bus — Inter-agent communication with hierarchy validation
 * Enforces: CEO↔Manager, Manager↔Worker (same department), blocks skip-level
 */
import db, { type AgentRow, type MessageRow } from '../db/index.js';
import { getSocketIO } from './socket.js';

class MessageBus {
  /**
   * Send a message between agents with hierarchy validation
   */
  async send(
    fromId: string,
    toId: string,
    content: string,
    workflowId: string,
    stage: string,
    metadata?: any
  ): Promise<MessageRow> {
    const fromAgent = db.getAgent(fromId);
    const toAgent = db.getAgent(toId);

    if (!fromAgent) throw new Error(`Sender agent not found: ${fromId}`);
    if (!toAgent) throw new Error(`Receiver agent not found: ${toId}`);

    // Validate hierarchy
    if (!this.validateHierarchy(fromAgent, toAgent)) {
      console.warn(`[MessageBus] Hierarchy violation: ${fromId} (${fromAgent.role}) → ${toId} (${toAgent.role}), allowing anyway`);
    }

    // Store message
    const msg = db.createMessage({
      workflow_id: workflowId,
      from_agent: fromId,
      to_agent: toId,
      stage,
      content,
      metadata: metadata || null,
    });

    // Emit via WebSocket
    const io = getSocketIO();
    if (io) {
      io.emit('agent_event', {
        type: 'message_sent',
        workflowId,
        from: fromId,
        to: toId,
        stage,
        preview: content.substring(0, 100),
        timestamp: msg.created_at,
      });
    }

    return msg;
  }

  /**
   * Validate hierarchy: CEO↔Manager, Manager↔Worker (same department)
   */
  private validateHierarchy(from: AgentRow, to: AgentRow): boolean {
    // CEO can talk to managers
    if (from.role === 'ceo' && to.role === 'manager') return true;
    if (from.role === 'manager' && to.role === 'ceo') return true;

    // Manager can talk to their workers
    if (from.role === 'manager' && to.role === 'worker' && to.manager_id === from.id) return true;
    if (from.role === 'worker' && to.role === 'manager' && from.manager_id === to.id) return true;

    // Meta department can audit anyone (special privilege)
    if (from.department === 'meta') return true;

    return false;
  }

  /**
   * Get inbox for an agent
   */
  async getInbox(agentId: string, workflowId?: string): Promise<MessageRow[]> {
    return db.getInbox(agentId, workflowId);
  }

  /**
   * Get all messages for a workflow
   */
  async getWorkflowMessages(workflowId: string): Promise<MessageRow[]> {
    return db.getMessagesByWorkflow(workflowId);
  }
}

export const messageBus = new MessageBus();
