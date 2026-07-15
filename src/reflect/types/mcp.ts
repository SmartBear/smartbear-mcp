import type { TestPlatform } from "./common.ts";

//
// Requests
//

export interface McpConnectToSessionMessage {
  type: "mcp:connect-to-session";
  id: string;
}

export interface McpAddPromptStepMessage {
  type: "mcp:add-prompt-step";
  id: string;
  prompt: string;
}

export interface McpAddSegmentMessage {
  type: "mcp:add-segment";
  id: string;
  segmentId: number;
}

export interface McpDeleteStepMessage {
  type: "mcp:delete-step";
  id: string;
}

export interface McpGetScreenshotMessage {
  type: "mcp:get-screenshot";
  format: "png" | "jpeg";
  id: string;
}

export type McpMessage =
  | McpConnectToSessionMessage
  | McpAddPromptStepMessage
  | McpAddSegmentMessage
  | McpDeleteStepMessage
  | McpGetScreenshotMessage;

//
// Success Responses
//

export interface McpConnectToSessionSuccessResponse {
  type: "mcp:connect-to-session:success";
  id: string;
  platform: TestPlatform;
  test: { name: string };
}

export interface McpAddPromptStepSuccessResponse {
  type: "mcp:add-prompt-step:success";
  id: string;
  result: {
    type: string;
    response?: unknown;
  };
}

export interface McpAddSegmentSuccessResponse {
  type: "mcp:add-segment:success";
  id: string;
}

export interface McpDeleteStepSuccessResponse {
  type: "mcp:delete-step:success";
  id: string;
}

export interface McpGetScreenshotSuccessResponse {
  type: "mcp:get-screenshot:success";
  id: string;
  imageBase64: string;
  state: {
    currentUrl?: string;
    appBuild?: { name: string };
  };
}

export type McpSuccessResponse =
  | McpConnectToSessionSuccessResponse
  | McpAddPromptStepSuccessResponse
  | McpAddSegmentSuccessResponse
  | McpDeleteStepSuccessResponse
  | McpGetScreenshotSuccessResponse;

//
// Failure Responses
//

export interface McpConnectToSessionFailureResponse {
  type: "mcp:connect-to-session:failure";
  id: string;
}

export interface McpAddPromptStepFailureResponse {
  type: "mcp:add-prompt-step:failure";
  id: string;
}

export interface McpAddSegmentFailureResponse {
  type: "mcp:add-segment:failure";
  id: string;
}

export interface McpDeleteStepFailureResponse {
  type: "mcp:delete-step:failure";
  id: string;
}

export interface McpGetScreenshotFailureResponse {
  type: "mcp:get-screenshot:failure";
  id: string;
}

export type McpFailureResponse =
  | McpConnectToSessionFailureResponse
  | McpAddPromptStepFailureResponse
  | McpAddSegmentFailureResponse
  | McpDeleteStepFailureResponse
  | McpGetScreenshotFailureResponse;
