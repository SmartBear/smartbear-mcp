/**
 * WebSocket Manager
 * Handles bidirectional WebSocket communication with Reflect recording sessions
 */

import WebSocket from "ws";
import { WEBSOCKET_HOSTNAME } from "./config/constants.ts";
import type { McpMessage } from "./types/mcp.ts";

interface PendingResponse {
  resolve: (msg: unknown) => void;
  reject: (err: unknown) => void;
}

// Grace period to allow the WebSocket close handshake to complete before
// tearing down the connection.
const DISCONNECT_GRACE_PERIOD_MS = 100;

export class WebSocketManager {
  private readonly sessionId: string;
  private readonly authHeader: Record<string, string>;
  private mcpSocket: WebSocket | null = null;
  private readonly pendingResponses: Map<string, PendingResponse> = new Map();

  constructor(sessionId: string, authHeader: Record<string, string>) {
    this.sessionId = sessionId;
    this.authHeader = authHeader;
  }

  async connect(): Promise<void> {
    if (this.mcpSocket?.readyState === WebSocket.OPEN) {
      throw new Error("WebSocket is already connected");
    }
    try {
      await this.connectMcpSocket();
    } catch (error) {
      throw new Error(
        `Failed to connect WebSocket: ${(error as Error).message}`,
        { cause: error },
      );
    }
  }

  private connectMcpSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      const url = `wss://${WEBSOCKET_HOSTNAME}/websocket/v2/recordings/${this.sessionId}/topics/mcp?sid=${this.sessionId}`;
      this.mcpSocket = new WebSocket(url, {
        headers: {
          ...this.authHeader,
        },
      });

      this.mcpSocket.on("open", () => {
        resolve();
      });

      this.mcpSocket.on("message", (data: WebSocket.RawData) => {
        try {
          const message = JSON.parse(data.toString()) as {
            id?: string;
            type?: string;
          };

          const { id, type } = message;
          if (id && this.pendingResponses.has(id)) {
            const pending = this.pendingResponses.get(id) as PendingResponse;
            this.pendingResponses.delete(id);
            if (type?.endsWith(":success")) {
              pending.resolve(message);
            } else if (type?.endsWith(":failure")) {
              pending.reject(message);
            }
          }
        } catch {
          // Ignore malformed messages; they are not actionable.
        }
      });

      this.mcpSocket.on("error", (error: Error) => {
        reject(new Error(`MCP socket error: ${error.message}`));
      });
    });
  }

  sendMcpMessage(message: McpMessage): Promise<void> {
    if (!this.mcpSocket || this.mcpSocket.readyState !== WebSocket.OPEN) {
      throw new Error("WebSocket is not connected");
    }

    return new Promise((resolve, reject) => {
      this.mcpSocket?.send(JSON.stringify(message), (error) => {
        if (error) {
          reject(new Error(`Failed to send MCP message: ${error.message}`));
        } else {
          resolve();
        }
      });
    });
  }

  waitForResponse(id: string): Promise<unknown> {
    return new Promise((resolve, reject) => {
      this.pendingResponses.set(id, { resolve, reject });
    });
  }

  async disconnect(): Promise<void> {
    if (this.mcpSocket) {
      this.mcpSocket.removeAllListeners();
      if (
        this.mcpSocket.readyState === WebSocket.OPEN ||
        this.mcpSocket.readyState === WebSocket.CONNECTING
      ) {
        this.mcpSocket.close();
      }
      this.mcpSocket = null;
    }

    await new Promise<void>((resolve) =>
      setTimeout(resolve, DISCONNECT_GRACE_PERIOD_MS),
    );
  }

  isConnected(): boolean {
    return this.mcpSocket?.readyState === WebSocket.OPEN;
  }
}
