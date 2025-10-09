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
  pacticipant: z
    .string()
    .describe(
      "The name of the pacticipant (application/service) being evaluated for deployment",
    ),
  version: z
    .string()
    .describe(
      "The version of the pacticipant that you want to check if it's safe to deploy",
    ),
  environment: z
    .string()
    .describe(
      "The target environment where the pacticipant version will be deployed (e.g., 'production', 'staging', 'test')",
    ),
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

export const MatrixSchema = z.object({
  latestby: z
    .string()
    .optional()
    .describe(
      "This property removes the rows for the overridden pacts/verifications from the results. The options are cvp (show only the latest row for each consumer version and provider) and cvpv (show only the latest row each consumer version and provider version). For a can-i-deploy query with one selector, it should be set to cvp. For a can-i-deploy query with two selectors, it should be set to cvpv.",
    ),
  limit: z
    .number()
    .min(1)
    .max(1000)
    .default(100)
    .optional()
    .describe(
      "The limit on the number of results to return (1-1000, default: 100)",
    ),
  q: z
    .array(
      z.object({
        pacticipant: z
          .string()
          .describe("Name of the pacticipant (application)"),
        version: z.string().optional().describe("Version number"),
        branch: z
          .string()
          .optional()
          .describe("Name of the pacticipant version branch"),
        environment: z
          .string()
          .optional()
          .describe(
            "The name of the environment that the pacticipant version is deployed to",
          ),
        latest: z
          .boolean()
          .optional()
          .describe(
            "Used in conjunction with other properties to indicate whether the selector is describing the latest version from a branch/with a tag/for a pacticipant, or all of them. Note that when used with tags, the 'latest' is calculated using the creation date of the pacticipant version, NOT the creation date of the tag.",
          ),
        tag: z
          .string()
          .optional()
          .describe(
            "The name of the pacticipant version tag (superseded by branch and environments)",
          ),
        mainBranch: z
          .boolean()
          .optional()
          .describe(
            "Whether or not the version(s) described are from the main branch of the pacticipant, as set in the mainBranch property of the pacticipant resource.",
          ),
      }),
    )
    .min(1)
    .max(2),
});

export interface MatrixResponse {
  matrix: Array<{
    consumer: Record<string, any> | null;
    pact: Record<string, any> | null;
    provider: Record<string, any> | null;
    verificationResult: Record<string, any> | null;
  }>;
  notices: Array<{
    text: string | null;
    type: Record<string, any> | null;
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
export type MatrixInput = z.infer<typeof MatrixSchema>;
