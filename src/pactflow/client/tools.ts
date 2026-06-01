/**
 * TOOLS
 *
 * Extends the default `ToolParams` with:
 *  - `handler`: Name of the `PactflowClient` method to execute.
 *  - `clients`: List of `ClientType`s allowed to use the tool.
 *  - `formatResponse` (optional): Formats the tool's output before returning.
 *
 * In `PactflowClient.registerTools()`, tools are filtered by `clientType`
 * and registered with their corresponding handler.
 */

import { z } from "zod";
import type { ToolParams } from "../../common/types";
import { GenerationInputSchema, RefineInputSchema } from "./ai";
import {
  AdminRoleIdSchema,
  AdminTeamIdSchema,
  AdminUserIdSchema,
  AuditSchema,
  CanIDeploySchema,
  CreateAdminUserSchema,
  CreateEnvironmentSchema,
  CreatePacticipantSchema,
  CreateRoleSchema,
  CreateSecretSchema,
  CreateSystemAccountSchema,
  CreateTeamSchema,
  CreateWebhookSchema,
  DeleteBranchSchema,
  DeleteIntegrationSchema,
  DeletePacticipantSchema,
  GetBiDirectionalConsumerProviderVersionSchema,
  GetBiDirectionalProviderVersionSchema,
  GetBranchSchema,
  GetBranchVersionsSchema,
  GetCurrentlyDeployedSchema,
  GetCurrentlySupportedSchema,
  GetEnvironmentSchema,
  GetIntegrationsByTeamSchema,
  GetLabelSchema,
  GetLatestVersionSchema,
  GetPacticipantNetworkSchema,
  GetPacticipantSchema,
  GetPactsForVerificationSchema,
  GetSystemAccountTokensSchema,
  GetVersionDeployedSchema,
  GetVersionSchema,
  InviteUsersSchema,
  LabelByNameSchema,
  ListAdminTeamsSchema,
  ListAdminUsersSchema,
  ListBranchesSchema,
  ListVersionsSchema,
  ManageLabelSchema,
  MatrixSchema,
  PatchTeamUsersSchema,
  PublishConsumerContractsSchema,
  PublishProviderContractSchema,
  RecordDeploymentSchema,
  RecordReleaseSchema,
  RegenerateTokenSchema,
  SecretIdSchema,
  SetTeamUsersSchema,
  SetUserRolesSchema,
  TeamUserIdSchema,
  UpdateAdminUserSchema,
  UpdateEnvironmentSchema,
  UpdatePacticipantSchema,
  UpdateRoleSchema,
  UpdateSecretSchema,
  UpdateTeamSchema,
  UpdateVersionSchema,
  UpdateWebhookSchema,
  UserRoleSchema,
  WebhookIdSchema,
} from "./base";

export type ClientType = "pactflow" | "pact_broker";

export interface PactflowToolParams extends ToolParams {
  handler: string;
  clients: ClientType[];
  formatResponse?: (result: any) => any;
  enableElicitation?: boolean;
  tags?: Array<string>;
}

export const TOOLS: PactflowToolParams[] = [
  {
    title: "Generate Pact Tests",
    toolset: "Generate Pact Tests",
    summary:
      "Generate Pact tests using PactFlow AI. You can provide one or more of the following input types: (1) request/response pairs for specific interactions, (2) code files to analyze and extract interactions from, and/or (3) OpenAPI document to generate tests for specific endpoints. When providing an OpenAPI document, a matcher is required to specify which endpoints to generate tests for.",
    purpose: "Generate Pact tests for API interactions",
    inputSchema: GenerationInputSchema,
    handler: "generate",
    clients: ["pactflow"], // ONLY pactflow
    enableElicitation: true,
    tags: ["pactflow-ai"],
  },
  {
    title: "Review Pact Tests",
    toolset: "Review Pact Tests",
    summary:
      "Review Pact tests using PactFlow AI. You can provide the following inputs: (1) Pact tests to be reviewed along with metadata",
    purpose: "Review Pact tests for API interactions",
    inputSchema: RefineInputSchema,
    handler: "review",
    clients: ["pactflow"],
    enableElicitation: true,
    tags: ["pactflow-ai"],
  },
  {
    title: "Get Provider States",
    toolset: "Fetch Provider States",
    summary: "Retrieve the states of a specific provider",
    purpose:
      "A provider state in Pact defines the specific preconditions that must be met on the provider side before a consumer-provider interaction can be tested. It sets up the provider in the right context—such as ensuring a particular user or record exists—so that the provider can return the response the consumer expects. This makes contract tests reliable, repeatable, and isolated by injecting or configuring the necessary data and conditions directly into the provider before each test runs.",
    inputSchema: z.object({
      provider: z
        .string()
        .describe("name of the provider to retrieve states for"),
    }),
    handler: "getProviderStates",
    clients: ["pactflow", "pact_broker"],
  },
  {
    title: "Can I Deploy",
    toolset: "Can I Deploy",
    summary:
      "Performs a comprehensive compatibility check to determine whether a specific version of a service (pacticipant) can be safely deployed into a given environment. It analyzes the complete contract matrix of consumer-provider relationships to confirm that all required integrations are verified and compatible.",
    purpose:
      "To serve as a deployment safety check within the PactBroker and PactFlow ecosystem, leveraging contract testing results to validate whether a specific service / pacticipant version is compatible with all integrated services. This feature prevents unsafe releases, reduces integration risks, and enables teams to confidently automate deployments across environments with a clear, auditable record of verification results.",
    inputSchema: CanIDeploySchema,
    handler: "canIDeploy",
    clients: ["pactflow", "pact_broker"],
  },
  {
    title: "Matrix",
    toolset: "Matrix",
    summary:
      "Retrieve the comprehensive contract verification matrix that shows the relationship between consumer and provider versions, their associated pact files, and verification results stored in the Pact Broker or Pactflow. The matrix provides detailed visibility into which consumer and provider versions have been successfully verified against each other, and highlights failures with detailed information about the cause.",
    purpose:
      "The Matrix serves as a powerful tool for teams to understand the state of their contract testing ecosystem. It enables tracking of all interactions between consumer and provider versions over time, with detailed insights into verification successes and failures. This helps teams rapidly identify compatibility issues, understand why specific verifications failed, and make informed decisions about deployments. Matrix offers a more intuitive and consolidated view of the verification status, making it easier to spot trends or problematic versions. Additionally, the Matrix supports complex queries using selectors, and can answer specific 'can-i-deploy' questions, ensuring that only compatible versions are deployed to production environments.",
    useCases: [
      "Quickly identify which consumer and provider version combinations have passed or failed verification.",
      "Diagnose and investigate why a particular consumer-provider verification failed.",
      "Visualize the overall contract compatibility across two pacticipants / services.",
      "Perform advanced queries using selectors to understand compatibility within specific branches, environments, or version ranges.",
      "Support informed deployment decisions by answering 'can I deploy version X of this service to production?'",
      "Expose contract verification details to non-frequent API users in a more accessible format.",
    ],
    inputSchema: MatrixSchema,
    handler: "getMatrix",
    clients: ["pactflow", "pact_broker"],
  },
  {
    title: "Check PactFlow AI Entitlements",
    toolset: "PactFlow AI Status",
    summary:
      "Check your PactFlow AI entitlements and credit balance if you encounter 401 Unauthorized errors or permission/credit issues when using PactFlow AI features.",
    purpose:
      "Retrieve AI entitlement information when PactFlow AI operations fail with 401 unauthorized errors. Use this to diagnose permission issues, check remaining credits, and verify account eligibility for AI features.",
    useCases: [
      "Diagnose 401 unauthorized errors when attempting to use PactFlow AI features",
      "Check remaining AI credits when PactFlow AI operations are rejected due to insufficient credits",
      "Verify account entitlements when users receive permission denied errors for PactFlow AI functionality",
      "Troubleshoot PactFlow AI access issues by retrieving current entitlement status and credit balance",
      "Provide detailed error context when PactFlow AI features are unavailable due to account limitations",
    ],
    handler: "checkAIEntitlements",
    clients: ["pactflow"],
  },
  {
    title: "Get Metrics",
    toolset: "Metrics",
    summary: "Fetch metrics across the entire workspace",
    purpose:
      "Fetch metrics across the workspace. Use this to get an overview of contract testing usage, resource consumption and account-wide statistics.",
    inputSchema: z.object({}),
    handler: "getMetrics",
    clients: ["pactflow", "pact_broker"],
  },
  {
    title: "Get Team Metrics",
    toolset: "Metrics",
    summary: "Fetch metrics for all teams",
    purpose:
      "Fetch metrics for all teams within PactFlow. Use this to get an overview of team-specific contract testing usage, resource consumption and usage statistics.",
    inputSchema: z.object({}),
    handler: "getTeamMetrics",
    clients: ["pactflow"],
  },
  {
    title: "List Pacticipants",
    toolset: "Pacticipants",
    summary:
      "Retrieve all pacticipants (applications/services) registered in the Pact Broker or PactFlow workspace.",
    purpose:
      "Get an overview of all registered services and their metadata. Use this to discover what applications are participating in contract testing, check their main branches, and find repository URLs.",
    inputSchema: z.object({
      pageNumber: z.number().optional().describe("Page number (default: 1)"),
      pageSize: z.number().optional().describe("Number of results per page"),
    }),
    handler: "listPacticipants",
    clients: ["pactflow", "pact_broker"],
  },
  {
    title: "Get Pacticipant",
    toolset: "Pacticipants",
    summary: "Retrieve details for a specific pacticipant by name.",
    purpose:
      "Fetch metadata for a single application/service including its display name, main branch, repository URL, and labels.",
    inputSchema: GetPacticipantSchema,
    handler: "getPacticipant",
    clients: ["pactflow", "pact_broker"],
  },
  {
    title: "List Branches",
    toolset: "Branches and Versions",
    summary:
      "Retrieve all branches for a given pacticipant, with optional filtering and pagination.",
    purpose:
      "Explore the branches that have published pacts or verifications. Useful for understanding the active development lines of a service and for identifying stale branches to clean up.",
    inputSchema: ListBranchesSchema,
    handler: "listBranches",
    clients: ["pactflow", "pact_broker"],
  },
  {
    title: "List Pacticipant Versions",
    toolset: "Branches and Versions",
    summary: "Retrieve all versions for a given pacticipant.",
    purpose:
      "List all published versions of a service with their branch and tag associations. Useful for understanding which versions exist and tracing deployment history.",
    inputSchema: ListVersionsSchema,
    handler: "listVersions",
    clients: ["pactflow", "pact_broker"],
  },
  {
    title: "Get Pacticipant Version",
    toolset: "Branches and Versions",
    summary: "Retrieve details for a specific version of a pacticipant.",
    purpose:
      "Fetch metadata for a single version including its branches, tags, and build URL.",
    inputSchema: GetVersionSchema,
    handler: "getVersion",
    clients: ["pactflow", "pact_broker"],
  },
  {
    title: "Get Latest Pacticipant Version",
    toolset: "Branches and Versions",
    summary:
      "Retrieve the latest version of a pacticipant, optionally filtered by tag.",
    purpose:
      "Quickly identify the most recent version of a service. When a tag is provided, returns the latest version that has that tag applied (e.g. the latest version tagged 'prod').",
    inputSchema: GetLatestVersionSchema,
    handler: "getLatestVersion",
    clients: ["pactflow", "pact_broker"],
  },
  {
    title: "List Environments",
    toolset: "Environments and Deployments",
    summary:
      "Retrieve all environments configured in the Pact Broker or PactFlow workspace.",
    purpose:
      "Get the list of deployment environments (e.g. development, staging, production) so you can use their UUIDs in record-deployment and can-i-deploy operations.",
    inputSchema: z.object({}),
    handler: "listEnvironments",
    clients: ["pactflow", "pact_broker"],
  },
  {
    title: "Get Environment",
    toolset: "Environments and Deployments",
    summary: "Retrieve details for a specific environment by UUID.",
    purpose:
      "Fetch metadata for a single environment including its name, display name, production flag, and associated teams.",
    inputSchema: GetEnvironmentSchema,
    handler: "getEnvironment",
    clients: ["pactflow", "pact_broker"],
  },
  {
    title: "Record Deployment",
    toolset: "Environments and Deployments",
    summary:
      "Record that a version of a pacticipant has been deployed to an environment.",
    purpose:
      "Inform PactFlow/Pact Broker of a successful deployment so that can-i-deploy checks and contract verification can use real deployment state. This is a key step in the PactFlow deployment workflow — run it after each successful deploy to keep the deployment state accurate.",
    inputSchema: RecordDeploymentSchema,
    handler: "recordDeployment",
    clients: ["pactflow", "pact_broker"],
  },
  {
    title: "Get Currently Deployed Versions",
    toolset: "Environments and Deployments",
    summary: "Retrieve all versions currently deployed to a given environment.",
    purpose:
      "Check which versions of all services are currently running in an environment. Useful for auditing the state of an environment or for troubleshooting deployment issues.",
    inputSchema: GetCurrentlyDeployedSchema,
    handler: "getCurrentlyDeployed",
    clients: ["pactflow", "pact_broker"],
  },
  {
    title: "Record Release",
    toolset: "Environments and Deployments",
    summary:
      "Record that a version of a pacticipant has been released to an environment (for mobile/library release workflows).",
    purpose:
      "Use for services that are 'released' rather than 'deployed' — e.g. mobile apps, libraries, or multi-version APIs where multiple versions coexist simultaneously. Unlike record-deployment (which marks previous versions as no longer deployed), record-release marks a version as currently supported without replacing prior versions.",
    inputSchema: RecordReleaseSchema,
    handler: "recordRelease",
    clients: ["pactflow", "pact_broker"],
  },
  {
    title: "Get Currently Supported Versions",
    toolset: "Environments and Deployments",
    summary:
      "Retrieve all versions currently released and supported in a given environment.",
    purpose:
      "Check which released versions are still actively supported in an environment. Important for mobile or library workflows where multiple versions are simultaneously in use.",
    inputSchema: GetCurrentlySupportedSchema,
    handler: "getCurrentlySupported",
    clients: ["pactflow", "pact_broker"],
  },
  {
    title: "Publish Consumer Contracts",
    toolset: "Contracts",
    summary:
      "Publish one or more consumer Pact contracts to the Pact Broker or PactFlow, with branch and tag metadata.",
    purpose:
      "Upload consumer-driven contract files after running consumer tests. Associate each contract with a branch and version number so that PactFlow can match it to provider verification results and enable can-i-deploy checks.",
    inputSchema: PublishConsumerContractsSchema,
    handler: "publishContracts",
    clients: ["pactflow", "pact_broker"],
  },
  {
    title: "Publish Provider Contract",
    toolset: "Contracts",
    summary:
      "Publish a provider OpenAPI contract and self-verification results to PactFlow (Bi-Directional Contract Testing).",
    purpose:
      "Upload an OpenAPI specification as a provider contract along with the results of running a tool (e.g. Dredd, Schemathesis) that verifies the provider implementation against the spec. This enables PactFlow to perform automated cross-contract verification without requiring the provider to run the consumer Pact tests.",
    inputSchema: PublishProviderContractSchema,
    handler: "publishProviderContract",
    clients: ["pactflow"],
  },
  {
    title: "Get Pacts for Verification",
    toolset: "Contracts",
    summary:
      "Retrieve the pacts that a provider should verify, based on consumer version selectors and WIP/pending pact configuration.",
    purpose:
      "Fetch the exact set of consumer pacts that a provider needs to verify in its current CI run. Use consumer version selectors to control which consumer branches and environments are included. Enable WIP pacts to get early feedback on new consumer interactions without breaking the provider build.",
    inputSchema: GetPactsForVerificationSchema,
    handler: "getPactsForVerification",
    clients: ["pactflow", "pact_broker"],
  },
  {
    title: "Get BDCT Provider Contract",
    toolset: "Bi-Directional Contract Testing",
    summary:
      "Fetch the provider OpenAPI contract for a given provider version in Bi-Directional Contract Testing.",
    purpose:
      "Retrieve the OpenAPI specification that was published as the provider contract for a specific version. Also returns the verification status of that contract against all consumer pacts.",
    inputSchema: GetBiDirectionalProviderVersionSchema,
    handler: "getBiDirectionalProviderContract",
    clients: ["pactflow"],
  },
  {
    title: "Get BDCT Provider Contract Verification Results",
    toolset: "Bi-Directional Contract Testing",
    summary:
      "Fetch the self-verification results for a provider contract version in Bi-Directional Contract Testing.",
    purpose:
      "Retrieve the results of the tool (e.g. Dredd, Schemathesis) that verified the provider implementation against its own OpenAPI spec. Use this to understand whether the provider passed its self-verification step.",
    inputSchema: GetBiDirectionalProviderVersionSchema,
    handler: "getBiDirectionalProviderContractVerificationResults",
    clients: ["pactflow"],
  },
  {
    title: "Get BDCT Consumer Contracts",
    toolset: "Bi-Directional Contract Testing",
    summary:
      "Fetch all consumer Pact contracts relevant to a given provider version in Bi-Directional Contract Testing.",
    purpose:
      "Retrieve the consumer-side Pact contracts that PactFlow compared against the provider's OpenAPI spec for a specific provider version. Useful for understanding which consumer interactions triggered a cross-contract verification.",
    inputSchema: GetBiDirectionalProviderVersionSchema,
    handler: "getBiDirectionalConsumerContract",
    clients: ["pactflow"],
  },
  {
    title: "Get BDCT Consumer Contract Verification Results",
    toolset: "Bi-Directional Contract Testing",
    summary:
      "Fetch the consumer contract verification results for a given provider version in Bi-Directional Contract Testing.",
    purpose:
      "Retrieve the results of comparing all consumer Pact contracts against the provider's OpenAPI spec for a specific provider version. Shows whether each consumer interaction is covered by the spec.",
    inputSchema: GetBiDirectionalProviderVersionSchema,
    handler: "getBiDirectionalConsumerContractVerificationResults",
    clients: ["pactflow"],
  },
  {
    title: "Get BDCT Cross-Contract Verification Results",
    toolset: "Bi-Directional Contract Testing",
    summary:
      "Fetch the cross-contract verification results for a given provider version in Bi-Directional Contract Testing.",
    purpose:
      "Retrieve the combined results of PactFlow's automated cross-contract comparison for a specific provider version — the outcome of comparing the provider's OpenAPI spec against all relevant consumer Pact files. This is the key result that determines whether can-i-deploy will pass.",
    inputSchema: GetBiDirectionalProviderVersionSchema,
    handler: "getBiDirectionalCrossContractVerificationResults",
    clients: ["pactflow"],
  },
  {
    title: "Get BDCT Consumer by Consumer Version",
    toolset: "Bi-Directional Contract Testing",
    summary:
      "Fetch the consumer Pact contract for a specific consumer-provider version pair in Bi-Directional Contract Testing.",
    purpose:
      "Retrieve the Pact contract published by a specific consumer version, in the context of a specific provider version. Use this when you need the exact consumer contract that was compared against a given provider spec.",
    inputSchema: GetBiDirectionalConsumerProviderVersionSchema,
    handler: "getBiDirectionalConsumerContractByConsumer",
    clients: ["pactflow"],
  },
  {
    title: "Get BDCT Provider by Consumer Version",
    toolset: "Bi-Directional Contract Testing",
    summary:
      "Fetch the provider OpenAPI contract for a specific consumer-provider version pair in Bi-Directional Contract Testing.",
    purpose:
      "Retrieve the provider's OpenAPI spec in the context of a specific consumer version pair. Useful when investigating why a particular consumer-provider combination failed cross-contract verification.",
    inputSchema: GetBiDirectionalConsumerProviderVersionSchema,
    handler: "getBiDirectionalProviderContractByConsumer",
    clients: ["pactflow"],
  },
  {
    title: "Get BDCT Provider Check Results by Consumer",
    toolset: "Bi-Directional Contract Testing",
    summary:
      "Fetch the provider contract self-verification results for a specific consumer-provider version pair in Bi-Directional Contract Testing.",
    purpose:
      "Retrieve the provider's self-verification results in the context of a specific consumer version pair. Use when diagnosing failures for a particular consumer-provider combination.",
    inputSchema: GetBiDirectionalConsumerProviderVersionSchema,
    handler: "getBiDirectionalProviderContractVerificationResultsByConsumer",
    clients: ["pactflow"],
  },
  {
    title: "Get BDCT Consumer Pact Test Results by Consumer",
    toolset: "Bi-Directional Contract Testing",
    summary:
      "Fetch the consumer contract verification results for a specific consumer-provider version pair in Bi-Directional Contract Testing.",
    purpose:
      "Retrieve the results of comparing a specific consumer version's Pact against the provider's OpenAPI spec. Shows exactly which interactions passed or failed the cross-contract comparison.",
    inputSchema: GetBiDirectionalConsumerProviderVersionSchema,
    handler: "getBiDirectionalConsumerContractVerificationResultsByConsumer",
    clients: ["pactflow"],
  },
  {
    title: "Get BDCT X-Contract Test Results by Consumer",
    toolset: "Bi-Directional Contract Testing",
    summary:
      "Fetch the cross-contract verification results for a specific consumer-provider version pair in Bi-Directional Contract Testing.",
    purpose:
      "Retrieve the precise cross-contract comparison outcome between a specific consumer version and provider version. This is the most granular BDCT result — use it to understand exactly why a specific consumer-provider pairing succeeded or failed, and which interactions were incompatible.",
    inputSchema: GetBiDirectionalConsumerProviderVersionSchema,
    handler: "getBiDirectionalCrossContractVerificationResultsByConsumer",
    clients: ["pactflow"],
  },
  {
    title: "List Integrations",
    toolset: "Integrations and Network",
    summary:
      "Retrieve all consumer-provider integrations registered in the workspace.",
    purpose:
      "Get a high-level view of all the consumer-provider pairings that have pacts published. An integration is automatically created when a consumer publishes a pact for a provider.",
    inputSchema: z.object({}),
    handler: "listIntegrations",
    clients: ["pactflow", "pact_broker"],
  },
  {
    title: "Get Pacticipant Network",
    toolset: "Integrations and Network",
    summary:
      "Retrieve the integration network graph for a specific pacticipant.",
    purpose:
      "Visualise all the consumer-provider relationships for a service — both the services it consumes and the consumers that depend on it. Use this to understand the blast radius of changes to a service.",
    inputSchema: GetPacticipantNetworkSchema,
    handler: "getPacticipantNetwork",
    clients: ["pactflow", "pact_broker"],
  },
  {
    title: "List Labels",
    toolset: "Labels",
    summary: "Retrieve all labels used across the workspace.",
    purpose:
      "Get a list of every label that has been applied to any pacticipant. Labels are used to categorise services and enable label-based queries.",
    inputSchema: z.object({
      pageNumber: z.number().optional().describe("Page number"),
      pageSize: z.number().optional().describe("Results per page"),
    }),
    handler: "listLabels",
    clients: ["pactflow", "pact_broker"],
  },
  {
    title: "Get Pacticipant Label",
    toolset: "Labels",
    summary: "Check whether a specific label is applied to a pacticipant.",
    purpose:
      "Verify that a label exists on a pacticipant. Returns 404 if the label is not applied.",
    inputSchema: GetLabelSchema,
    handler: "getPacticipantLabel",
    clients: ["pactflow", "pact_broker"],
  },
  {
    title: "List Pacticipants by Label",
    toolset: "Labels",
    summary: "Retrieve all pacticipants that have a specific label applied.",
    purpose:
      "Filter the pacticipant list by label. Useful for querying services by team ownership, technology, or any custom grouping you have applied via labels.",
    inputSchema: LabelByNameSchema,
    handler: "listPacticipantsByLabel",
    clients: ["pactflow", "pact_broker"],
  },
  {
    title: "Update Pacticipant",
    toolset: "Pacticipants",
    summary:
      "Fully replace a pacticipant's metadata (display name, main branch, repository URL, etc.).",
    purpose:
      "Update a service's metadata with a full replacement. All fields not provided will be cleared. Use Patch Pacticipant instead if you only want to update specific fields.",
    inputSchema: UpdatePacticipantSchema,
    handler: "updatePacticipant",
    clients: ["pactflow", "pact_broker"],
  },
  {
    title: "Patch Pacticipant",
    toolset: "Pacticipants",
    summary:
      "Partially update a pacticipant's metadata — only fields provided are changed.",
    purpose:
      "Update one or more properties of a service without affecting the others. Prefer this over Update Pacticipant when you only need to change a specific field such as the main branch.",
    inputSchema: UpdatePacticipantSchema,
    handler: "patchPacticipant",
    clients: ["pactflow", "pact_broker"],
  },
  {
    title: "Update Pacticipant Version",
    toolset: "Branches and Versions",
    summary: "Update metadata for a specific pacticipant version.",
    purpose:
      "Set or update the build URL for an existing version. This is useful when the build URL was not available at publish time.",
    inputSchema: UpdateVersionSchema,
    handler: "updateVersion",
    clients: ["pactflow", "pact_broker"],
  },
  {
    title: "Get Branch Versions",
    toolset: "Branches and Versions",
    summary:
      "Retrieve all versions published from a specific branch of a pacticipant.",
    purpose:
      "List the history of versions for a particular branch. Useful for understanding which versions were created on a feature branch before it was merged.",
    inputSchema: GetBranchVersionsSchema,
    handler: "getBranchVersions",
    clients: ["pactflow", "pact_broker"],
  },
  {
    title: "Get Deployed Versions for Version",
    toolset: "Environments and Deployments",
    summary:
      "Retrieve deployment records for a specific pacticipant version in a specific environment.",
    purpose:
      "Check the deployment history for a particular version in a given environment. Returns all deployment records including whether each is currently active.",
    inputSchema: GetVersionDeployedSchema,
    handler: "getDeployedVersions",
    clients: ["pactflow", "pact_broker"],
  },
  {
    title: "Get Released Versions for Version",
    toolset: "Environments and Deployments",
    summary:
      "Retrieve release records for a specific pacticipant version in a specific environment.",
    purpose:
      "Check the release history for a particular version in a given environment. Used in mobile/library workflows to see all release records for a version.",
    inputSchema: GetVersionDeployedSchema,
    handler: "getReleasedVersions",
    clients: ["pactflow", "pact_broker"],
  },
  {
    title: "Create Environment",
    toolset: "Environments and Deployments",
    summary: "Create a new deployment environment in PactFlow.",
    purpose:
      "Register a new environment (e.g. 'staging', 'production') so it can be used in record-deployment and can-i-deploy workflows.",
    inputSchema: CreateEnvironmentSchema,
    handler: "createEnvironment",
    clients: ["pactflow", "pact_broker"],
  },
  {
    title: "Update Environment",
    toolset: "Environments and Deployments",
    summary: "Update an existing environment's metadata.",
    purpose:
      "Rename an environment, change its production flag, or update team assignments.",
    inputSchema: UpdateEnvironmentSchema,
    handler: "updateEnvironment",
    clients: ["pactflow", "pact_broker"],
  },
  {
    title: "Delete Environment",
    toolset: "Environments and Deployments",
    summary: "Delete an environment by UUID.",
    purpose:
      "Remove an environment that is no longer needed. This will also remove all deployed and released version records for this environment.",
    inputSchema: GetEnvironmentSchema,
    handler: "deleteEnvironment",
    clients: ["pactflow", "pact_broker"],
  },
  {
    title: "Create Pacticipant",
    toolset: "Pacticipants",
    summary:
      "Register a new application/service (pacticipant) in the workspace.",
    purpose:
      "Create a pacticipant entry before publishing contracts or recording deployments. The name cannot be changed after creation.",
    inputSchema: CreatePacticipantSchema,
    handler: "createPacticipant",
    clients: ["pactflow", "pact_broker"],
  },
  {
    title: "Delete Pacticipant",
    toolset: "Pacticipants",
    summary: "Delete a pacticipant and all its associated data.",
    purpose:
      "Remove a service from the workspace, including all its pacts, verifications, deployments, and version records.",
    inputSchema: DeletePacticipantSchema,
    handler: "deletePacticipant",
    clients: ["pactflow", "pact_broker"],
  },
  {
    title: "Get Branch",
    toolset: "Branches and Versions",
    summary: "Retrieve details for a specific branch of a pacticipant.",
    purpose:
      "Fetch metadata for a single branch, including its latest version.",
    inputSchema: GetBranchSchema,
    handler: "getBranch",
    clients: ["pactflow", "pact_broker"],
  },
  {
    title: "Delete Branch",
    toolset: "Branches and Versions",
    summary: "Delete a branch from a pacticipant.",
    purpose:
      "Remove a stale branch record. This does not delete the versions or pacts published from the branch.",
    inputSchema: DeleteBranchSchema,
    handler: "deleteBranch",
    clients: ["pactflow", "pact_broker"],
  },
  {
    title: "Add Label to Pacticipant",
    toolset: "Labels",
    summary: "Apply a label to a pacticipant.",
    purpose:
      "Tag a service with a label for grouping and filtering. Creates the label if it does not already exist.",
    inputSchema: ManageLabelSchema,
    handler: "addLabel",
    clients: ["pactflow", "pact_broker"],
  },
  {
    title: "Remove Label from Pacticipant",
    toolset: "Labels",
    summary: "Remove a label from a pacticipant.",
    purpose:
      "Delete the label association from a pacticipant. Does not affect other pacticipants that have the same label.",
    inputSchema: ManageLabelSchema,
    handler: "removeLabel",
    clients: ["pactflow", "pact_broker"],
  },
  {
    title: "Get Integrations by Team",
    toolset: "Integrations and Network",
    summary:
      "Retrieve all consumer-provider integrations belonging to a specific team.",
    purpose:
      "Filter the integration list by team ownership to see only the pairings relevant to a given team.",
    inputSchema: GetIntegrationsByTeamSchema,
    handler: "getIntegrationsByTeam",
    clients: ["pactflow"],
  },
  {
    title: "Delete Integration",
    toolset: "Integrations and Network",
    summary: "Delete a specific consumer-provider integration.",
    purpose:
      "Remove the integration record between a consumer and provider. Use with caution — this removes the link even if pacts exist.",
    inputSchema: DeleteIntegrationSchema,
    handler: "deleteIntegration",
    clients: ["pactflow", "pact_broker"],
  },
  {
    title: "Delete All Integrations",
    toolset: "Integrations and Network",
    summary: "Delete ALL consumer-provider integrations in the workspace.",
    purpose:
      "Bulk-remove all integration records. This is a destructive operation — use only when resetting the workspace.",
    inputSchema: z.object({}),
    handler: "deleteAllIntegrations",
    clients: ["pactflow", "pact_broker"],
  },
  {
    title: "List Webhooks",
    toolset: "Webhooks",
    summary: "Retrieve all webhooks configured in the workspace.",
    purpose:
      "Get an overview of all webhook triggers, their target URLs, and enabled/disabled status.",
    inputSchema: z.object({}),
    handler: "listWebhooks",
    clients: ["pactflow", "pact_broker"],
  },
  {
    title: "Get Webhook",
    toolset: "Webhooks",
    summary: "Retrieve details for a specific webhook by UUID.",
    purpose:
      "Fetch the full configuration of a single webhook including events, request details, and consumer/provider filters.",
    inputSchema: WebhookIdSchema,
    handler: "getWebhook",
    clients: ["pactflow", "pact_broker"],
  },
  {
    title: "Create Webhook",
    toolset: "Webhooks",
    summary: "Create a new webhook to trigger on contract events.",
    purpose:
      "Set up automated notifications or CI triggers that fire when contracts change, verifications are published, or other events occur.",
    inputSchema: CreateWebhookSchema,
    handler: "createWebhook",
    clients: ["pactflow", "pact_broker"],
  },
  {
    title: "Update Webhook",
    toolset: "Webhooks",
    summary: "Update an existing webhook's configuration.",
    purpose:
      "Modify the URL, events, consumer/provider filters, or enabled status of a webhook.",
    inputSchema: UpdateWebhookSchema,
    handler: "updateWebhook",
    clients: ["pactflow", "pact_broker"],
  },
  {
    title: "Delete Webhook",
    toolset: "Webhooks",
    summary: "Delete a webhook by UUID.",
    purpose:
      "Permanently remove a webhook. Any in-flight triggered executions will still complete.",
    inputSchema: WebhookIdSchema,
    handler: "deleteWebhook",
    clients: ["pactflow", "pact_broker"],
  },
  {
    title: "Test Execute Webhooks",
    toolset: "Webhooks",
    summary:
      "Trigger a test execution of all matching webhooks without a real event.",
    purpose:
      "Verify webhook configuration by sending a test request. Useful for debugging URL, auth, or body template issues.",
    inputSchema: z.object({}),
    handler: "executeWebhooks",
    clients: ["pactflow", "pact_broker"],
  },
  {
    title: "Execute Webhook",
    toolset: "Webhooks",
    summary: "Trigger a test execution of a specific webhook.",
    purpose:
      "Send a test request for a single webhook to verify its configuration without waiting for a real event.",
    inputSchema: WebhookIdSchema,
    handler: "executeWebhook",
    clients: ["pactflow", "pact_broker"],
  },
  {
    title: "List Secrets",
    toolset: "Secrets",
    summary: "Retrieve all secrets stored in the workspace.",
    purpose:
      "Get an overview of all configured secrets. Note: secret values are never returned — only metadata.",
    inputSchema: z.object({}),
    handler: "listSecrets",
    clients: ["pactflow"],
  },
  {
    title: "Get Secret",
    toolset: "Secrets",
    summary: "Retrieve metadata for a specific secret by UUID.",
    purpose:
      "Fetch secret metadata (name, description, team). The secret value is never returned.",
    inputSchema: SecretIdSchema,
    handler: "getSecret",
    clients: ["pactflow"],
  },
  {
    title: "Create Secret",
    toolset: "Secrets",
    summary: "Create a new secret for use in webhook authentication.",
    purpose:
      "Store a sensitive value (API key, password, token) securely. The value can be referenced in webhook configurations without exposing it.",
    inputSchema: CreateSecretSchema,
    handler: "createSecret",
    clients: ["pactflow"],
  },
  {
    title: "Update Secret",
    toolset: "Secrets",
    summary: "Update an existing secret's name, value, or description.",
    purpose:
      "Rotate or rename a secret. The team assignment cannot be changed after creation.",
    inputSchema: UpdateSecretSchema,
    handler: "updateSecret",
    clients: ["pactflow"],
  },
  {
    title: "Delete Secret",
    toolset: "Secrets",
    summary: "Delete a secret by UUID.",
    purpose:
      "Permanently remove a secret. Any webhooks referencing this secret will need to be updated.",
    inputSchema: SecretIdSchema,
    handler: "deleteSecret",
    clients: ["pactflow"],
  },
  {
    title: "Get Current User",
    toolset: "User, Tokens and Preferences",
    summary: "Retrieve the profile of the currently authenticated user.",
    purpose:
      "Check who you are authenticated as, including your UUID, name, email, and roles.",
    inputSchema: z.object({}),
    handler: "getCurrentUser",
    clients: ["pactflow"],
  },
  {
    title: "List API Tokens",
    toolset: "User, Tokens and Preferences",
    summary: "Retrieve API tokens for the current user.",
    purpose:
      "List the read-only and read-write API tokens for the authenticated user.",
    inputSchema: z.object({}),
    handler: "listTokens",
    clients: ["pactflow"],
  },
  {
    title: "Regenerate API Token",
    toolset: "User, Tokens and Preferences",
    summary: "Regenerate (rotate) an API token by ID.",
    purpose:
      "Invalidate the current token and generate a new one. Use when a token has been compromised.",
    inputSchema: RegenerateTokenSchema,
    handler: "regenerateToken",
    clients: ["pactflow"],
  },
  {
    title: "Get User Preferences",
    toolset: "User, Tokens and Preferences",
    summary: "Retrieve the current user's preferences.",
    purpose: "Fetch all preference settings for the authenticated user.",
    inputSchema: z.object({}),
    handler: "getUserPreferences",
    clients: ["pactflow"],
  },
  {
    title: "Get System Preferences",
    toolset: "User, Tokens and Preferences",
    summary: "Retrieve system-wide preferences.",
    purpose: "Fetch all system-level preference settings for the workspace.",
    inputSchema: z.object({}),
    handler: "getSystemPreferences",
    clients: ["pactflow"],
  },
  {
    title: "Get Audit Log",
    toolset: "Audit",
    summary: "Retrieve the audit log of events in the workspace.",
    purpose:
      "Search and filter the audit trail of actions taken in PactFlow. Useful for compliance, debugging, and security reviews.",
    useCases: [
      "Review recent changes to pacticipants, webhooks, or secrets",
      "Investigate who published a specific pact or verification",
      "Filter events by user or event type for compliance reporting",
      "Track deployment recording activity across environments",
    ],
    inputSchema: AuditSchema,
    handler: "getAuditLog",
    clients: ["pactflow"],
  },
  {
    title: "Admin List Users",
    toolset: "Admin",
    summary: "List all users in the workspace (admin).",
    purpose:
      "Get an overview of all user accounts with optional filtering by active status, name/email, or user type.",
    inputSchema: ListAdminUsersSchema,
    handler: "listAdminUsers",
    clients: ["pactflow"],
  },
  {
    title: "Admin Get User",
    toolset: "Admin",
    summary: "Retrieve details for a specific user by UUID (admin).",
    purpose:
      "Fetch a user's profile including their email, name, roles, and active status.",
    inputSchema: AdminUserIdSchema,
    handler: "getAdminUser",
    clients: ["pactflow"],
  },
  {
    title: "Admin Create User",
    toolset: "Admin",
    summary: "Create a new user account (admin).",
    purpose:
      "Add a new user to the workspace. For SSO environments, provide externalIdpId or externalIdpUsername to match the IdP identity.",
    inputSchema: CreateAdminUserSchema,
    handler: "createAdminUser",
    clients: ["pactflow"],
  },
  {
    title: "Admin Update User",
    toolset: "Admin",
    summary: "Update a user's profile or active status (admin).",
    purpose:
      "Modify user details such as name, email, or active status. Deactivating a user prevents them from logging in.",
    inputSchema: UpdateAdminUserSchema,
    handler: "updateAdminUser",
    clients: ["pactflow"],
  },
  {
    title: "Admin Delete User",
    toolset: "Admin",
    summary: "Delete a user account (admin).",
    purpose: "Permanently remove a user from the workspace.",
    inputSchema: AdminUserIdSchema,
    handler: "deleteAdminUser",
    clients: ["pactflow"],
  },
  {
    title: "Admin Invite Users",
    toolset: "Admin",
    summary: "Send invitations to new users (admin).",
    purpose:
      "Invite one or more people to join the workspace by email. They will receive an invitation email.",
    inputSchema: InviteUsersSchema,
    handler: "inviteUsers",
    clients: ["pactflow"],
  },
  {
    title: "Admin Set User Roles",
    toolset: "Admin",
    summary: "Replace all roles assigned to a user (admin).",
    purpose:
      "Fully replace the set of roles for a user. All existing roles are removed and replaced with the provided list.",
    inputSchema: SetUserRolesSchema,
    handler: "setUserRoles",
    clients: ["pactflow"],
  },
  {
    title: "Admin Add Role to User",
    toolset: "Admin",
    summary: "Add a single role to a user (admin).",
    purpose:
      "Grant an additional role to a user without affecting their existing roles.",
    inputSchema: UserRoleSchema,
    handler: "addRoleToUser",
    clients: ["pactflow"],
  },
  {
    title: "Admin Remove Role from User",
    toolset: "Admin",
    summary: "Remove a single role from a user (admin).",
    purpose:
      "Revoke a specific role from a user without affecting their other roles.",
    inputSchema: UserRoleSchema,
    handler: "removeRoleFromUser",
    clients: ["pactflow"],
  },
  {
    title: "Admin List Teams",
    toolset: "Admin",
    summary: "List all teams in the workspace (admin).",
    purpose:
      "Get an overview of all teams with optional name filtering and pagination.",
    inputSchema: ListAdminTeamsSchema,
    handler: "listAdminTeams",
    clients: ["pactflow"],
  },
  {
    title: "Admin Get Team",
    toolset: "Admin",
    summary: "Retrieve details for a specific team by UUID (admin).",
    purpose:
      "Fetch a team's configuration including its name, members, environments, and pacticipants.",
    inputSchema: AdminTeamIdSchema,
    handler: "getAdminTeam",
    clients: ["pactflow"],
  },
  {
    title: "Admin Create Team",
    toolset: "Admin",
    summary: "Create a new team (admin).",
    purpose:
      "Add a new team to the workspace and optionally assign administrators, environments, and pacticipants.",
    inputSchema: CreateTeamSchema,
    handler: "createAdminTeam",
    clients: ["pactflow"],
  },
  {
    title: "Admin Update Team",
    toolset: "Admin",
    summary: "Replace a team's configuration (admin).",
    purpose:
      "Fully update a team's name, administrators, environments, and pacticipant assignments.",
    inputSchema: UpdateTeamSchema,
    handler: "updateAdminTeam",
    clients: ["pactflow"],
  },
  {
    title: "Admin Delete Team",
    toolset: "Admin",
    summary: "Delete a team (admin).",
    purpose:
      "Permanently remove a team from the workspace. Members are not deleted.",
    inputSchema: AdminTeamIdSchema,
    handler: "deleteAdminTeam",
    clients: ["pactflow"],
  },
  {
    title: "Admin List Team Users",
    toolset: "Admin",
    summary: "List all users in a specific team (admin).",
    purpose: "Retrieve all user members of a team.",
    inputSchema: AdminTeamIdSchema,
    handler: "listTeamUsers",
    clients: ["pactflow"],
  },
  {
    title: "Admin Get Team User",
    toolset: "Admin",
    summary: "Check if a specific user is a member of a team (admin).",
    purpose:
      "Verify team membership for a user. Returns 404 if the user is not in the team.",
    inputSchema: TeamUserIdSchema,
    handler: "getTeamUser",
    clients: ["pactflow"],
  },
  {
    title: "Admin Set Team Users",
    toolset: "Admin",
    summary: "Replace all members of a team (admin).",
    purpose:
      "Fully replace the set of users in a team. All existing members are removed and replaced with the provided list.",
    inputSchema: SetTeamUsersSchema,
    handler: "setTeamUsers",
    clients: ["pactflow"],
  },
  {
    title: "Admin Patch Team Users",
    toolset: "Admin",
    summary:
      "Add or remove individual users from a team using JSON Patch (admin).",
    purpose:
      "Make targeted changes to team membership — add specific users or remove them — without replacing the entire member list.",
    inputSchema: PatchTeamUsersSchema,
    handler: "patchTeamUsers",
    clients: ["pactflow"],
  },
  {
    title: "Admin Remove User from Team",
    toolset: "Admin",
    summary: "Remove a specific user from a team (admin).",
    purpose: "Revoke team membership for a user.",
    inputSchema: TeamUserIdSchema,
    handler: "removeUserFromTeam",
    clients: ["pactflow"],
  },
  {
    title: "Admin List Roles",
    toolset: "Admin",
    summary: "List all roles defined in the workspace (admin).",
    purpose:
      "Get an overview of all role definitions and their associated permissions.",
    inputSchema: z.object({}),
    handler: "listAdminRoles",
    clients: ["pactflow"],
  },
  {
    title: "Admin Get Role",
    toolset: "Admin",
    summary: "Retrieve details for a specific role by UUID (admin).",
    purpose:
      "Fetch a role's name, description, and full list of permission scopes.",
    inputSchema: AdminRoleIdSchema,
    handler: "getAdminRole",
    clients: ["pactflow"],
  },
  {
    title: "Admin Create Role",
    toolset: "Admin",
    summary: "Create a new role with specific permissions (admin).",
    purpose:
      "Define a custom role with a tailored set of permission scopes. Roles can then be assigned to users.",
    inputSchema: CreateRoleSchema,
    handler: "createAdminRole",
    clients: ["pactflow"],
  },
  {
    title: "Admin Update Role",
    toolset: "Admin",
    summary: "Update an existing role's name and permissions (admin).",
    purpose:
      "Modify the permission set of a role. Changes take effect for all users assigned the role.",
    inputSchema: UpdateRoleSchema,
    handler: "updateAdminRole",
    clients: ["pactflow"],
  },
  {
    title: "Admin Delete Role",
    toolset: "Admin",
    summary: "Delete a role (admin).",
    purpose:
      "Permanently remove a role. Users currently assigned this role will lose its permissions.",
    inputSchema: AdminRoleIdSchema,
    handler: "deleteAdminRole",
    clients: ["pactflow"],
  },
  {
    title: "Admin Reset Roles",
    toolset: "Admin",
    summary: "Reset all roles to their factory defaults (admin).",
    purpose:
      "Restore the built-in roles to their original permission sets. Custom roles are removed.",
    inputSchema: z.object({}),
    handler: "resetAdminRoles",
    clients: ["pactflow"],
  },
  {
    title: "Admin List Permissions",
    toolset: "Admin",
    summary: "List all available permission scopes (admin).",
    purpose: "Retrieve all permission scopes that can be assigned to roles.",
    inputSchema: z.object({}),
    handler: "listAdminPermissions",
    clients: ["pactflow"],
  },
  {
    title: "Admin Create System Account",
    toolset: "Admin",
    summary: "Create a new system account (admin).",
    purpose:
      "Add a machine/service account that can authenticate via API token rather than user credentials.",
    inputSchema: CreateSystemAccountSchema,
    handler: "createSystemAccount",
    clients: ["pactflow"],
  },
  {
    title: "Admin Get System Account Tokens",
    toolset: "Admin",
    summary: "Retrieve API tokens for a system account (admin).",
    purpose:
      "Get the tokens associated with a system account for use in CI/CD pipelines.",
    inputSchema: GetSystemAccountTokensSchema,
    handler: "getSystemAccountTokens",
    clients: ["pactflow"],
  },
];
