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

export const GetPacticipantSchema = z.object({
  pacticipantName: z
    .string()
    .describe("Name of the pacticipant (application or service)"),
});

export const ListBranchesSchema = z.object({
  pacticipantName: z.string().describe("Name of the pacticipant"),
  q: z.string().optional().describe("Filter branches by name"),
  pageNumber: z.number().optional().describe("Page number (default: 1)"),
  pageSize: z.number().optional().describe("Results per page (default: 100)"),
});

export const ListVersionsSchema = z.object({
  pacticipantName: z.string().describe("Name of the pacticipant"),
  pageNumber: z.number().optional().describe("Page number"),
  pageSize: z.number().optional().describe("Results per page"),
});

export const GetVersionSchema = z.object({
  pacticipantName: z.string().describe("Name of the pacticipant"),
  versionNumber: z.string().describe("Version number to retrieve"),
});

export const GetLatestVersionSchema = z.object({
  pacticipantName: z.string().describe("Name of the pacticipant"),
  tag: z
    .string()
    .optional()
    .describe(
      "Tag to filter by. If omitted, returns the overall latest version.",
    ),
});

export const GetEnvironmentSchema = z.object({
  environmentId: z.string().describe("UUID of the environment"),
});

export const RecordDeploymentSchema = z.object({
  pacticipantName: z
    .string()
    .describe("Name of the pacticipant that was deployed"),
  versionNumber: z.string().describe("Version number that was deployed"),
  environmentId: z.string().describe("UUID of the target environment"),
  applicationInstance: z
    .string()
    .optional()
    .describe(
      "Identifies a specific instance when multiple instances of the same application are deployed to the same environment (e.g. 'blue', 'green')",
    ),
});

export const GetCurrentlyDeployedSchema = z.object({
  environmentId: z.string().describe("UUID of the environment"),
});

export const RecordReleaseSchema = z.object({
  pacticipantName: z
    .string()
    .describe("Name of the pacticipant that was released"),
  versionNumber: z.string().describe("Version number that was released"),
  environmentId: z.string().describe("UUID of the target environment"),
});

export const GetCurrentlySupportedSchema = z.object({
  environmentId: z.string().describe("UUID of the environment"),
});

export const PublishConsumerContractsSchema = z.object({
  pacticipantName: z
    .string()
    .min(1)
    .describe("Name of the consumer application"),
  pacticipantVersionNumber: z
    .string()
    .min(1)
    .describe("Version number of the consumer"),
  contracts: z
    .array(
      z.object({
        consumerName: z.string().describe("Consumer application name"),
        providerName: z.string().describe("Provider application name"),
        content: z.string().describe("Base64-encoded Pact JSON content"),
        contentType: z
          .literal("application/json")
          .describe("Content type (must be 'application/json')"),
        specification: z
          .literal("pact")
          .describe("Specification type (must be 'pact')"),
      }),
    )
    .describe("Contracts to publish"),
  tags: z
    .array(z.string())
    .optional()
    .describe("Version tags (e.g. 'main', 'staging')"),
  branch: z.string().optional().describe("Branch name of the consumer"),
  buildUrl: z
    .string()
    .optional()
    .describe("URL of the CI build that produced these contracts"),
});

export const PublishProviderContractSchema = z.object({
  providerName: z.string().describe("Name of the provider application"),
  pacticipantVersionNumber: z
    .string()
    .min(1)
    .describe("Version number of the provider"),
  contract: z
    .object({
      content: z
        .string()
        .describe("Base64-encoded OpenAPI specification content"),
      contentType: z
        .enum(["application/json", "application/yaml", "application/yml"])
        .describe("Content type of the OpenAPI spec"),
      specification: z
        .literal("oas")
        .describe("Specification type (must be 'oas')"),
      selfVerificationResults: z
        .object({
          success: z.boolean().describe("Whether self-verification passed"),
          content: z
            .string()
            .optional()
            .describe("Verification results content (e.g. test output)"),
          contentType: z
            .string()
            .optional()
            .describe("Content type of the verification results"),
          verifier: z
            .string()
            .describe(
              "Name of the tool used for verification (e.g. 'dredd', 'schemathesis')",
            ),
          verifierVersion: z
            .string()
            .optional()
            .describe("Version of the verification tool"),
          format: z
            .string()
            .optional()
            .describe("Format of the verification results"),
        })
        .describe(
          "Results of self-verifying the provider against its own contract",
        ),
    })
    .describe("Provider contract (OpenAPI spec) and verification details"),
  tags: z.array(z.string()).optional().describe("Version tags"),
  branch: z.string().optional().describe("Branch name of the provider"),
  buildUrl: z.string().optional().describe("URL of the CI build"),
});

export const GetPactsForVerificationSchema = z.object({
  providerName: z.string().describe("Name of the provider to get pacts for"),
  consumerVersionSelectors: z
    .array(
      z.object({
        branch: z.string().optional().describe("Consumer branch name"),
        consumer: z.string().optional().describe("Consumer name"),
        deployed: z
          .boolean()
          .optional()
          .describe("Include versions that are currently deployed"),
        deployedOrReleased: z
          .boolean()
          .optional()
          .describe("Include versions that are currently deployed or released"),
        environment: z.string().optional().describe("Environment name"),
        fallbackBranch: z
          .string()
          .optional()
          .describe("Fallback branch if primary branch doesn't exist"),
        latest: z
          .boolean()
          .optional()
          .describe("Select only the latest version"),
        mainBranch: z
          .boolean()
          .optional()
          .describe("Select versions from the consumer's main branch"),
        matchingBranch: z
          .boolean()
          .optional()
          .describe(
            "Select versions from the branch that matches the provider branch",
          ),
        released: z
          .boolean()
          .optional()
          .describe("Include versions that are currently released"),
        tag: z.string().optional().describe("Tag name (legacy, prefer branch)"),
      }),
    )
    .optional()
    .describe("Selectors specifying which consumer versions to include"),
  includePendingStatus: z
    .boolean()
    .optional()
    .describe("Include the pending status in the results"),
  includeWipPactsSince: z
    .string()
    .optional()
    .describe("Include WIP pacts published since this date (ISO 8601)"),
  providerVersionBranch: z
    .string()
    .optional()
    .describe("Branch of the provider version being verified"),
  providerVersionTags: z
    .array(z.string())
    .optional()
    .describe("Tags for the provider version being verified"),
});

export const GetLabelSchema = z.object({
  pacticipantName: z.string().describe("Name of the pacticipant"),
  labelName: z.string().describe("Name of the label"),
});

export const LabelByNameSchema = z.object({
  labelName: z.string().describe("Label name to filter by"),
});

export const UpdatePacticipantSchema = z.object({
  pacticipantName: z.string().describe("Name of the pacticipant to update"),
  displayName: z.string().optional().describe("Human-readable display name"),
  mainBranch: z
    .string()
    .optional()
    .describe("Name of the main/trunk branch (e.g. 'main')"),
  repositoryName: z.string().optional().describe("Repository name"),
  repositoryNamespace: z
    .string()
    .optional()
    .describe("Repository namespace/organisation"),
  repositoryUrl: z.string().optional().describe("URL of the source repository"),
});

export const UpdateVersionSchema = z.object({
  pacticipantName: z.string().describe("Name of the pacticipant"),
  versionNumber: z.string().describe("Version number to update"),
  buildUrl: z
    .string()
    .optional()
    .describe("URL of the CI build that produced this version"),
});

export const GetBranchVersionsSchema = z.object({
  pacticipantName: z.string().describe("Name of the pacticipant"),
  branchName: z.string().describe("Name of the branch"),
  pageNumber: z.number().optional().describe("Page number"),
  pageSize: z.number().optional().describe("Results per page"),
});

export const GetVersionDeployedSchema = z.object({
  pacticipantName: z.string().describe("Name of the pacticipant"),
  versionNumber: z.string().describe("Version number"),
  environmentId: z.string().describe("UUID of the environment"),
});

export type GetLabelInput = z.infer<typeof GetLabelSchema>;
export type LabelByNameInput = z.infer<typeof LabelByNameSchema>;
export type UpdatePacticipantInput = z.infer<typeof UpdatePacticipantSchema>;
export type UpdateVersionInput = z.infer<typeof UpdateVersionSchema>;
export type GetBranchVersionsInput = z.infer<typeof GetBranchVersionsSchema>;
export type GetVersionDeployedInput = z.infer<typeof GetVersionDeployedSchema>;

export const GetBiDirectionalProviderVersionSchema = z.object({
  providerName: z.string().describe("Name of the provider"),
  providerVersionNumber: z.string().describe("Provider version number"),
});

export const GetBiDirectionalConsumerProviderVersionSchema = z.object({
  providerName: z.string().describe("Name of the provider"),
  providerVersionNumber: z.string().describe("Provider version number"),
  consumerName: z.string().describe("Name of the consumer"),
  consumerVersionNumber: z.string().describe("Consumer version number"),
});

export type GetBiDirectionalProviderVersionInput = z.infer<
  typeof GetBiDirectionalProviderVersionSchema
>;
export type GetBiDirectionalConsumerProviderVersionInput = z.infer<
  typeof GetBiDirectionalConsumerProviderVersionSchema
>;

export const GetPacticipantNetworkSchema = z.object({
  pacticipantName: z
    .string()
    .describe("Name of the pacticipant to get network for"),
});

export type GetPacticipantInput = z.infer<typeof GetPacticipantSchema>;
export type ListBranchesInput = z.infer<typeof ListBranchesSchema>;
export type ListVersionsInput = z.infer<typeof ListVersionsSchema>;
export type GetVersionInput = z.infer<typeof GetVersionSchema>;
export type GetLatestVersionInput = z.infer<typeof GetLatestVersionSchema>;
export type GetEnvironmentInput = z.infer<typeof GetEnvironmentSchema>;
export type RecordDeploymentInput = z.infer<typeof RecordDeploymentSchema>;
export type GetCurrentlyDeployedInput = z.infer<
  typeof GetCurrentlyDeployedSchema
>;
export type RecordReleaseInput = z.infer<typeof RecordReleaseSchema>;
export type GetCurrentlySupportedInput = z.infer<
  typeof GetCurrentlySupportedSchema
>;
export type PublishConsumerContractsInput = z.infer<
  typeof PublishConsumerContractsSchema
>;
export type PublishProviderContractInput = z.infer<
  typeof PublishProviderContractSchema
>;
export type GetPactsForVerificationInput = z.infer<
  typeof GetPactsForVerificationSchema
>;
export type GetPacticipantNetworkInput = z.infer<
  typeof GetPacticipantNetworkSchema
>;

interface CountMetric {
  count: number;
}

interface CountWithDateRangeMetric {
  count: number;
  first: string | null;
  last: string | null;
}

interface CountWithSuccessFailureMetric extends CountWithDateRangeMetric {
  successCount: number;
  failureCount: number;
}

interface DeployedVersionsMetric {
  count: number;
  currentlyDeployedCount: number;
}

interface ReleasedVersionsMetric {
  count: number;
  currentlySupportedCount: number;
}

interface UsersMetric {
  activeRegularCount: number;
  activeSystemCount: number;
}

// Team-specific metrics
export interface TeamMetrics {
  users: UsersMetric;
  interactions: {
    latestInteractionsCount: number;
    latestMessagesCount: number;
  };
  pacticipants: CountMetric;
  integrations: CountMetric;
  pactPublications: CountWithDateRangeMetric;
  pactVersions: CountMetric;
  verificationResults: CountWithSuccessFailureMetric;
  webhooks: CountMetric;
  webhookExecutions: CountMetric;
  triggeredWebhooks: CountMetric;
  secrets: CountMetric;
  environments: CountMetric;
  providerContractPublications: CountMetric;
  providerContractVersions: CountMetric;
  providerContractSelfVerifications: CountMetric;
  deployedVersions: DeployedVersionsMetric;
  releasedVersions: ReleasedVersionsMetric;
}

export interface TeamMetricsItem {
  name: string;
  metrics: TeamMetrics;
}

export interface TeamMetricsResponse {
  teams: TeamMetricsItem[];
}

// Account-wide metrics response
export interface MetricsResponse {
  interactions: {
    latestInteractionsCount: number;
    latestMessagesCount: number;
    latestInteractionsAndMessagesCount: number;
  };
  pacticipants: {
    count: number;
    withMainBranchSetCount: number;
  };
  integrations: CountMetric;
  pactPublications: CountWithDateRangeMetric;
  pactVersions: CountMetric;
  pactRevisionsPerConsumerVersion: {
    distribution: Record<string, number>;
  };
  verificationResults: CountWithSuccessFailureMetric & {
    distinctCount: number;
  };
  verificationResultsPerPactVersion: {
    distribution: Record<string, number>;
  };
  pacticipantVersions: {
    count: number;
    withUserCreatedBranchCount: number;
    withBranchCount: number;
    withBranchSetCount: number;
  };
  webhooks: CountMetric;
  tags: {
    count: number;
    distinctCount: number;
    distinctWithPacticipantCount: number;
  };
  triggeredWebhooks: CountMetric;
  webhookExecutions: CountMetric;
  matrix: CountMetric;
  environments: CountMetric;
  deployedVersions: DeployedVersionsMetric & {
    userCreatedCount: number;
  };
  releasedVersions: ReleasedVersionsMetric;
  users: UsersMetric;
  teams: CountMetric;
  providerContractPublications: CountMetric;
  providerContractVersions: CountMetric;
  providerContractSelfVerifications: CountMetric;
  crossContractComparisons: CountMetric;
  secrets: {
    count: number;
    countsByTeam: number[];
  };
}
