// Type definitions for PactFlow AI API
export type GenerationLanguage =
  | "javascript"
  | "typescript"
  | "java"
  | "golang"
  | "dotnet"
  | "kotlin"
  | "swift"
  | "php";

export type HttpMethod =
  | "GET"
  | "PUT"
  | "POST"
  | "DELETE"
  | "OPTIONS"
  | "HEAD"
  | "PATCH"
  | "TRACE";

export interface FileInput {
  filename?: string;
  body: string;
  language?: string;
}

export interface EndpointMatcher {
  path?: string;
  methods?: HttpMethod[];
  statusCodes?: (number | string)[];
  operationId?: string;
}

export interface OpenApi {
  openapi: string;
  paths: Record<string, Record<string, any>>;
  components?: Record<string, Record<string, any>>;
  [key: string]: any;
}

export interface OpenApiWithMatcher {
  document: OpenApi;
  matcher: EndpointMatcher;
}

export interface RequestResponsePair {
  request: FileInput;
  response: FileInput;
}

export interface GenerationInput {
  language?: GenerationLanguage;
  requestResponse?: RequestResponsePair;
  code?: FileInput[];
  openapi?: OpenApiWithMatcher;
  additionalInstructions?: string;
  testTemplate?: FileInput;
}

export interface StatusResponse {
  status: "accepted"; 
  session_id: string;
  submitted_at: string;
  status_url: string;
  result_url: string;
}

export interface SessionStatusResponse {
  status: "completed" | "accepted" | "invalid";
}

export interface GenerationResponse {
  id?: string;
  code: string;
  language: string;
}

export interface RefineInput {
  pactTests: FileInput;
  code?: FileInput[];
  userInstructions?: string;
  errorMessages?: string[];
  openapi?: OpenApiWithMatcher;
}

export interface RefineRecommendation {
  recommendation: string;
  diff?: string;
  confidence?: number;
}

export interface RefineResponse {
  recommendations: RefineRecommendation[];
}
