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
export const CreateEnvironmentSchema = z.object({
  name: z
    .string()
    .min(1)
    .describe("Unique name for the environment (e.g. 'production', 'staging')"),
  production: z.boolean().describe("Whether this is a production environment"),
  displayName: z.string().optional().describe("Human-readable display name"),
  teamUuids: z
    .array(z.string().uuid())
    .optional()
    .describe("UUIDs of teams that own this environment"),
});
export type CreateEnvironmentInput = z.infer<typeof CreateEnvironmentSchema>;

export const UpdateEnvironmentSchema = z.object({
  environmentId: z.string().describe("UUID of the environment to update"),
  name: z.string().min(1).describe("Unique name for the environment"),
  production: z.boolean().describe("Whether this is a production environment"),
  displayName: z.string().optional().describe("Human-readable display name"),
  teamUuids: z
    .array(z.string().uuid())
    .optional()
    .describe("UUIDs of teams that own this environment"),
});
export type UpdateEnvironmentInput = z.infer<typeof UpdateEnvironmentSchema>;
export const CreatePacticipantSchema = z.object({
  name: z
    .string()
    .min(1)
    .describe("Name of the pacticipant (cannot be changed after creation)"),
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
export type CreatePacticipantInput = z.infer<typeof CreatePacticipantSchema>;

export const DeletePacticipantSchema = z.object({
  pacticipantName: z.string().describe("Name of the pacticipant to delete"),
});
export type DeletePacticipantInput = z.infer<typeof DeletePacticipantSchema>;

export const GetBranchSchema = z.object({
  pacticipantName: z.string().describe("Name of the pacticipant"),
  branchName: z.string().describe("Name of the branch"),
});
export type GetBranchInput = z.infer<typeof GetBranchSchema>;

export const DeleteBranchSchema = z.object({
  pacticipantName: z.string().describe("Name of the pacticipant"),
  branchName: z.string().describe("Name of the branch to delete"),
});
export type DeleteBranchInput = z.infer<typeof DeleteBranchSchema>;

export const ManageLabelSchema = z.object({
  pacticipantName: z.string().describe("Name of the pacticipant"),
  labelName: z.string().describe("Name of the label"),
});
export type ManageLabelInput = z.infer<typeof ManageLabelSchema>;
export const GetIntegrationsByTeamSchema = z.object({
  teamId: z.string().describe("UUID of the team"),
});
export type GetIntegrationsByTeamInput = z.infer<
  typeof GetIntegrationsByTeamSchema
>;

export const DeleteIntegrationSchema = z.object({
  providerName: z.string().describe("Name of the provider"),
  consumerName: z.string().describe("Name of the consumer"),
});
export type DeleteIntegrationInput = z.infer<typeof DeleteIntegrationSchema>;
const WebhookRequestSchema = z.object({
  method: z.literal("POST").describe("HTTP method (must be POST)"),
  url: z.string().url().describe("URL to send the webhook request to"),
  body: z.any().optional().describe("Request body to send"),
  headers: z
    .record(z.string(), z.string())
    .optional()
    .describe("HTTP headers to include"),
  username: z.string().optional().describe("Username for basic auth"),
  password: z.string().optional().describe("Password for basic auth"),
});

const WebhookEventSchema = z.object({
  name: z
    .string()
    .describe(
      "Event name (e.g. 'contract_content_changed', 'provider_verification_published')",
    ),
});

export const CreateWebhookSchema = z.object({
  description: z.string().describe("Human-readable description of the webhook"),
  events: z
    .array(WebhookEventSchema)
    .min(1)
    .describe("Events that trigger this webhook"),
  request: WebhookRequestSchema.describe("HTTP request to send when triggered"),
  consumer: z
    .object({ name: z.string() })
    .optional()
    .describe("Restrict to a specific consumer (omit for all)"),
  provider: z
    .object({ name: z.string() })
    .optional()
    .describe("Restrict to a specific provider (omit for all)"),
  enabled: z
    .boolean()
    .optional()
    .default(true)
    .describe("Whether the webhook is enabled"),
  teamUuid: z
    .string()
    .uuid()
    .nullable()
    .optional()
    .describe("UUID of the owning team (null for global)"),
});
export type CreateWebhookInput = z.infer<typeof CreateWebhookSchema>;

export const UpdateWebhookSchema = z.object({
  webhookId: z.string().describe("UUID of the webhook to update"),
  description: z.string().optional().describe("Human-readable description"),
  events: z
    .array(WebhookEventSchema)
    .optional()
    .describe("Events that trigger this webhook"),
  request: WebhookRequestSchema.optional().describe(
    "HTTP request to send when triggered",
  ),
  consumer: z
    .object({ name: z.string() })
    .nullable()
    .optional()
    .describe("Restrict to a specific consumer"),
  provider: z
    .object({ name: z.string() })
    .nullable()
    .optional()
    .describe("Restrict to a specific provider"),
  enabled: z.boolean().optional().describe("Whether the webhook is enabled"),
  teamUuid: z
    .string()
    .uuid()
    .nullable()
    .optional()
    .describe("UUID of the owning team"),
});
export type UpdateWebhookInput = z.infer<typeof UpdateWebhookSchema>;

export const WebhookIdSchema = z.object({
  webhookId: z.string().describe("UUID of the webhook"),
});
export type WebhookIdInput = z.infer<typeof WebhookIdSchema>;
export const CreateSecretSchema = z.object({
  name: z.string().min(1).describe("Name of the secret"),
  value: z.string().min(1).describe("Value of the secret"),
  description: z
    .string()
    .nullable()
    .optional()
    .describe("Description of the secret"),
  teamUuid: z
    .string()
    .uuid()
    .optional()
    .describe("UUID of the owning team (cannot be changed after creation)"),
});
export type CreateSecretInput = z.infer<typeof CreateSecretSchema>;

export const UpdateSecretSchema = z.object({
  secretId: z.string().describe("UUID of the secret to update"),
  name: z.string().optional().describe("New name for the secret"),
  value: z.string().optional().describe("New value for the secret"),
  description: z.string().nullable().optional().describe("New description"),
});
export type UpdateSecretInput = z.infer<typeof UpdateSecretSchema>;

export const SecretIdSchema = z.object({
  secretId: z.string().describe("UUID of the secret"),
});
export type SecretIdInput = z.infer<typeof SecretIdSchema>;
export const RegenerateTokenSchema = z.object({
  tokenId: z.string().describe("ID of the token to regenerate"),
});
export type RegenerateTokenInput = z.infer<typeof RegenerateTokenSchema>;
export const AuditSchema = z.object({
  since: z
    .string()
    .optional()
    .describe("Only include events at or after this ISO 8601 timestamp"),
  userUuid: z
    .string()
    .uuid()
    .optional()
    .describe("Filter events by PactFlow user UUID"),
  type: z
    .string()
    .optional()
    .describe("Filter events by type (e.g. 'pact_publication')"),
  sort: z
    .string()
    .optional()
    .describe("Sort order: '+timestamp' (asc, default) or '-timestamp' (desc)"),
  from: z
    .string()
    .optional()
    .describe(
      "Start result set from this audit event UUID (keyset pagination)",
    ),
  pageNumber: z.number().int().min(1).optional().describe("Page number"),
  pageSize: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .describe("Results per page (max 100)"),
});
export type AuditInput = z.infer<typeof AuditSchema>;
export const ListAdminUsersSchema = z.object({
  active: z.boolean().optional().describe("Filter by active/inactive status"),
  q: z.string().optional().describe("Filter by name or email"),
  userType: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .describe("0 = regular users, 1 = system accounts"),
  page: z.number().optional().describe("Page number"),
  size: z.number().optional().describe("Results per page"),
});
export type ListAdminUsersInput = z.infer<typeof ListAdminUsersSchema>;

export const AdminUserIdSchema = z.object({
  userId: z.string().describe("UUID of the user"),
});
export type AdminUserIdInput = z.infer<typeof AdminUserIdSchema>;

export const CreateAdminUserSchema = z.object({
  email: z.string().describe("Email address of the new user"),
  name: z.string().describe("Display name of the new user"),
  firstName: z.string().optional().describe("First name"),
  lastName: z.string().optional().describe("Last name"),
  externalIdpId: z
    .string()
    .optional()
    .describe("External identity provider ID (for SAML/SSO)"),
  externalIdpUsername: z
    .string()
    .optional()
    .describe("External IdP username (for SAML/SSO)"),
});
export type CreateAdminUserInput = z.infer<typeof CreateAdminUserSchema>;

export const UpdateAdminUserSchema = z.object({
  userId: z.string().describe("UUID of the user to update"),
  active: z.boolean().optional().describe("Whether the user is active"),
  email: z.string().optional().describe("New email address"),
  firstName: z.string().optional().describe("First name"),
  lastName: z.string().optional().describe("Last name"),
  name: z.string().optional().describe("Display name"),
});
export type UpdateAdminUserInput = z.infer<typeof UpdateAdminUserSchema>;

export const InviteUsersSchema = z.object({
  users: z
    .array(
      z.object({
        email: z.string().describe("Email address"),
        name: z.string().min(1).describe("Display name"),
      }),
    )
    .min(1)
    .describe("List of users to invite"),
});
export type InviteUsersInput = z.infer<typeof InviteUsersSchema>;

export const SetUserRolesSchema = z.object({
  userId: z.string().describe("UUID of the user"),
  roles: z.array(z.string()).describe("Array of role UUIDs to assign"),
});
export type SetUserRolesInput = z.infer<typeof SetUserRolesSchema>;

export const UserRoleSchema = z.object({
  userId: z.string().describe("UUID of the user"),
  roleId: z.string().describe("UUID of the role"),
});
export type UserRoleInput = z.infer<typeof UserRoleSchema>;
export const ListAdminTeamsSchema = z.object({
  q: z.string().optional().describe("Filter teams by name"),
  page: z.number().optional().describe("Page number"),
  size: z.number().optional().describe("Results per page"),
});
export type ListAdminTeamsInput = z.infer<typeof ListAdminTeamsSchema>;

export const AdminTeamIdSchema = z.object({
  teamId: z.string().describe("UUID of the team"),
});
export type AdminTeamIdInput = z.infer<typeof AdminTeamIdSchema>;

export const CreateTeamSchema = z.object({
  name: z.string().min(1).describe("Name of the team"),
  administratorUuids: z
    .array(z.string().uuid())
    .optional()
    .describe("UUIDs of team administrators"),
  environmentUuids: z
    .array(z.string().uuid())
    .optional()
    .describe("UUIDs of environments assigned to this team"),
  pacticipantNames: z
    .array(z.string().min(1))
    .optional()
    .describe("Names of pacticipants assigned to this team"),
});
export type CreateTeamInput = z.infer<typeof CreateTeamSchema>;

export const UpdateTeamSchema = z.object({
  teamId: z.string().describe("UUID of the team to update"),
  name: z.string().min(1).describe("Name of the team"),
  administratorUuids: z
    .array(z.string().uuid())
    .optional()
    .describe("UUIDs of team administrators"),
  environmentUuids: z
    .array(z.string().uuid())
    .optional()
    .describe("UUIDs of environments assigned to this team"),
  pacticipantNames: z
    .array(z.string().min(1))
    .optional()
    .describe("Names of pacticipants assigned to this team"),
});
export type UpdateTeamInput = z.infer<typeof UpdateTeamSchema>;

export const TeamUserIdSchema = z.object({
  teamId: z.string().describe("UUID of the team"),
  userId: z.string().describe("UUID of the user"),
});
export type TeamUserIdInput = z.infer<typeof TeamUserIdSchema>;

export const PatchTeamUsersSchema = z.object({
  teamId: z.string().describe("UUID of the team"),
  operations: z
    .array(
      z.object({
        op: z.enum(["add", "remove"]).describe("Operation: 'add' or 'remove'"),
        path: z
          .literal("/users")
          .describe("JSON Patch path (must be '/users')"),
        value: z.object({
          uuid: z.string().uuid().describe("UUID of the user"),
        }),
      }),
    )
    .describe("JSON Patch operations to apply"),
});
export type PatchTeamUsersInput = z.infer<typeof PatchTeamUsersSchema>;

export const SetTeamUsersSchema = z.object({
  teamId: z.string().describe("UUID of the team"),
  uuids: z
    .array(z.string().uuid())
    .describe("UUIDs of users to set as team members (replaces existing)"),
});
export type SetTeamUsersInput = z.infer<typeof SetTeamUsersSchema>;
export const AdminRoleIdSchema = z.object({
  roleId: z.string().describe("UUID of the role"),
});
export type AdminRoleIdInput = z.infer<typeof AdminRoleIdSchema>;

export const CreateRoleSchema = z.object({
  name: z.string().min(1).describe("Name of the role"),
  permissions: z
    .array(
      z.object({
        scope: z
          .string()
          .describe("Permission scope (e.g. 'webhook:read', 'user:manage')"),
      }),
    )
    .describe("Permissions granted by this role"),
  description: z.string().optional().describe("Description of the role"),
});
export type CreateRoleInput = z.infer<typeof CreateRoleSchema>;

export const UpdateRoleSchema = z.object({
  roleId: z.string().describe("UUID of the role to update"),
  name: z.string().min(1).describe("Name of the role"),
  permissions: z
    .array(
      z.object({
        scope: z.string().describe("Permission scope"),
      }),
    )
    .describe("Permissions granted by this role"),
  description: z.string().optional().describe("Description of the role"),
});
export type UpdateRoleInput = z.infer<typeof UpdateRoleSchema>;
export const CreateSystemAccountSchema = z.object({
  name: z.string().min(1).describe("Name of the system account"),
});
export type CreateSystemAccountInput = z.infer<
  typeof CreateSystemAccountSchema
>;

export const GetSystemAccountTokensSchema = z.object({
  accountId: z.string().describe("UUID of the system account"),
});
export type GetSystemAccountTokensInput = z.infer<
  typeof GetSystemAccountTokensSchema
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
