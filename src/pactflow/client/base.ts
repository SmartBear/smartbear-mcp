import { z } from "zod";

export interface ProviderState {
  name: string;
  params?: Record<string, any> | null;
  consumers: string[];
}

export interface ProviderStatesResponse {
  providerStates: ProviderState[];
}

export const CanIDeploySchema = z.object({
  pacticipant: z.string(),
  version: z.string(),
  environment: z.string(),
});


export interface CanIDeployResponse {
  matrix: Array<{
    consumer: Record<string, any>;
    pact: Record<string, any>;
    provider: Record<string, any>;
    verificationResult: Record<string, any>;
  }>;
  notices: Array<{
    text: string;
    type: string;
  }>;
  summary: {
    deployable: boolean; // The property that indicates whether or not the pacticipant version is safe to deploy.
    failed: number;
    reason: string;
    success: number;
    unknown: number;
  };
}

export type CanIDeployInput = z.infer<typeof CanIDeploySchema>;
