/**
 * WebSocket Manager
 * Handles bidirectional WebSocket communication with Reflect recording sessions
 */

import WebSocket from "ws";
import { API_KEY_HEADER, WEBSOCKET_HOSTNAME } from "./config/constants";
import type { MCPMessage } from "./types/mcp";

interface PendingResponse {
  resolve: (msg: unknown) => void;
  reject: (err: unknown) => void;
}

export class WebSocketManager {
  private sessionId: string;
  private apiKey: string;
  private mcpSocket: WebSocket | null = null;
  private pendingResponses: Map<string, PendingResponse> = new Map();

  constructor(sessionId: string, apiKey: string) {
    this.sessionId = sessionId;
    this.apiKey = apiKey;
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
      );
    }
  }

  private async connectMcpSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      const url = `wss://${WEBSOCKET_HOSTNAME}/websocket/v2/recordings/${this.sessionId}/topics/mcp?sid=${this.sessionId}`;

      this.mcpSocket = new WebSocket(url, {
        headers: {
          [API_KEY_HEADER]: this.apiKey,
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
        } catch (error) {
          console.error("Failed to parse MCP message:", error);
        }
      });

      this.mcpSocket.on("error", (error: Error) => {
        reject(new Error(`MCP socket error: ${error.message}`));
      });

    });
  }

  async sendMcpMessage(message: MCPMessage): Promise<void> {
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

    await new Promise<void>((resolve) => setTimeout(resolve, 100));
  }

  isConnected(): boolean {
    return this.mcpSocket?.readyState === WebSocket.OPEN;
  }
}
