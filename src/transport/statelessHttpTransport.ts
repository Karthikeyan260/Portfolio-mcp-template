import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import type { JSONRPCMessage } from '@modelcontextprotocol/sdk/types.js';

function hasResponseId(
  message: JSONRPCMessage,
): message is JSONRPCMessage & { id: string | number } {
  return (
    typeof message === 'object' &&
    message !== null &&
    'id' in message &&
    message.id !== undefined &&
    message.id !== null
  );
}

/**
 * Minimal MCP Transport for a stateless Streamable HTTP server: one Worker fetch
 * request in, one JSON-RPC response out, no session id and no server-initiated
 * requests. Adequate here since every tool/resource/prompt in this server completes
 * synchronously within a single request-response cycle.
 */
export class StatelessHttpTransport implements Transport {
  onclose?: () => void;
  onerror?: (error: Error) => void;
  onmessage?: (message: JSONRPCMessage) => void;

  private readonly pending = new Map<string | number, (message: JSONRPCMessage) => void>();

  async start(): Promise<void> {
    // No-op: nothing to open for a stateless single-shot HTTP transport.
  }

  async send(message: JSONRPCMessage): Promise<void> {
    if (hasResponseId(message)) {
      const resolve = this.pending.get(message.id);
      if (resolve) {
        resolve(message);
        this.pending.delete(message.id);
      }
    }
  }

  async close(): Promise<void> {
    this.pending.clear();
    this.onclose?.();
  }

  /** Feeds one incoming JSON-RPC message in and resolves with its response (null for notifications). */
  async handleMessage(message: JSONRPCMessage): Promise<JSONRPCMessage | null> {
    if (!hasResponseId(message)) {
      this.onmessage?.(message);
      return null;
    }
    return new Promise<JSONRPCMessage>((resolve) => {
      this.pending.set(message.id, resolve);
      this.onmessage?.(message);
    });
  }
}
