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
import type { ToolParams } from "../../common/types.js";
import { GenerationInputSchema, RefineInputSchema } from "./ai.js";
import { CanIDeploySchema, MatrixSchema } from "./base.js";

export type ClientType = "pactflow" | "pact_broker";

export interface PactflowToolParams extends ToolParams {
  handler: string;
  clients: ClientType[];
  formatResponse?: (result: any) => any;
  enableElicitation?: boolean;
}

export const TOOLS: PactflowToolParams[] = [
  {
    title: "Generate Pact Tests",
    summary:
      "Generate Pact tests using PactFlow AI. You can provide one or more of the following input types: (1) request/response pairs for specific interactions, (2) code files to analyze and extract interactions from, and/or (3) OpenAPI document to generate tests for specific endpoints. When providing an OpenAPI document, a matcher is required to specify which endpoints to generate tests for.",
    purpose: "Generate Pact tests for API interactions",
    inputSchema: GenerationInputSchema,
    handler: "generate",
    clients: ["pactflow"], // ONLY pactflow
    enableElicitation: true,
  },
  {
    title: "Review Pact Tests",
    summary:
      "Review Pact tests using PactFlow AI. You can provide the following inputs: (1) Pact tests to be reviewed along with metadata",
    purpose: "Review Pact tests for API interactions",
    inputSchema: RefineInputSchema,
    handler: "review",
    clients: ["pactflow"],
    enableElicitation: true,
  },
  {
    title: "Get Provider States",
    summary: "Retrieve the states of a specific provider",
    purpose:
      "A provider state in Pact defines the specific preconditions that must be met on the provider side before a consumer–provider interaction can be tested. It sets up the provider in the right context—such as ensuring a particular user or record exists—so that the provider can return the response the consumer expects. This makes contract tests reliable, repeatable, and isolated by injecting or configuring the necessary data and conditions directly into the provider before each test runs.",
    parameters: [
      {
        name: "provider",
        type: z.string(),
        description: "name of the provider to retrieve states for",
        required: true,
      },
    ],
    handler: "getProviderStates",
    clients: ["pactflow", "pact_broker"],
  },
  {
    title: "Can I Deploy",
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
];
