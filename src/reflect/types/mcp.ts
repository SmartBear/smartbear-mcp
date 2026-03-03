import type { TestPlatform } from "./common";

//
// Requests
//

export interface MCPConnectToSessionMessage {
  type: "mcp:connect-to-session";
  id: string;
}

export interface MCPAddPromptStepMessage {
  type: "mcp:add-prompt-step";
  id: string;
  prompt: string;
}

export interface MCPAddSegmentMessage {
  type: "mcp:add-segment";
  id: string;
  segmentId: number;
}

export interface MCPDeleteStepMessage {
  type: "mcp:delete-step";
  id: string;
}

export interface MCPGetScreenshotMessage {
  type: "mcp:get-screenshot";
  id: string;
}

export type MCPMessage =
  | MCPConnectToSessionMessage
  | MCPAddPromptStepMessage
  | MCPAddSegmentMessage
  | MCPDeleteStepMessage
  | MCPGetScreenshotMessage;

//
// Success Responses
//

export interface MCPConnectToSessionSuccessResponse {
  type: "mcp:connect-to-session:success";
  id: string;
  platform: TestPlatform;
  test: { name: string };
}

export interface MCPAddPromptStepSuccessResponse {
  type: "mcp:add-prompt-step:success";
  id: string;
  result: {
    type: string;
    response?: unknown;
  };
}

export interface MCPAddSegmentSuccessResponse {
  type: "mcp:add-segment:success";
  id: string;
}

export interface MCPDeleteStepSuccessResponse {
  type: "mcp:delete-step:success";
  id: string;
}

export interface MCPGetScreenshotSuccessResponse {
  type: "mcp:get-screenshot:success";
  id: string;
  imageBase64: string;
  state: {
    currentUrl?: string;
    appBuild?: { name: string };
  };
}

export type MCPSuccessResponse =
  | MCPConnectToSessionSuccessResponse
  | MCPAddPromptStepSuccessResponse
  | MCPAddSegmentSuccessResponse
  | MCPDeleteStepSuccessResponse
  | MCPGetScreenshotSuccessResponse;

//
// Failure Responses
//

export interface MCPConnectToSessionFailureResponse {
  type: "mcp:connect-to-session:failure";
  id: string;
}

export interface MCPAddPromptStepFailureResponse {
  type: "mcp:add-prompt-step:failure";
  id: string;
}

export interface MCPAddSegmentFailureResponse {
  type: "mcp:add-segment:failure";
  id: string;
}

export interface MCPDeleteStepFailureResponse {
  type: "mcp:delete-step:failure";
  id: string;
}

export interface MCPGetScreenshotFailureResponse {
  type: "mcp:get-screenshot:failure";
  id: string;
}

export type MCPFailureResponse =
  | MCPConnectToSessionFailureResponse
  | MCPAddPromptStepFailureResponse
  | MCPAddSegmentFailureResponse
  | MCPDeleteStepFailureResponse
  | MCPGetScreenshotFailureResponse;
