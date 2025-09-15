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
import { ToolParams } from "../../common/types.js";
import {
  GenerationInputSchema,
  RefineInputSchema,
} from "./ai.js";
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
    zodSchema: GenerationInputSchema,
    handler: "generate",
    clients: ["pactflow"], // ONLY pactflow
    enableElicitation: true,
  },
  {
    title: "Review Pact Tests",
    summary: "Review Pact tests using PactFlow AI. You can provide the following inputs: (1) Pact tests to be reviewed along with metadata",
    purpose: "Review Pact tests for API interactions",
    zodSchema: RefineInputSchema,
    handler: "review",
    clients: ["pactflow"],
    enableElicitation: true,
  },
  {
    title: "Get Provider States",
    summary: "Retrieve the states of a specific provider",
    purpose: "A provider state in Pact defines the specific preconditions that must be met on the provider side before a consumer–provider interaction can be tested. It sets up the provider in the right context—such as ensuring a particular user or record exists—so that the provider can return the response the consumer expects. This makes contract tests reliable, repeatable, and isolated by injecting or configuring the necessary data and conditions directly into the provider before each test runs.",
    parameters: [
      {
        name: "provider",
        type: z.string(),
        description: "name of the provider to retrieve states for",
        required: true
      }
    ],
    handler: "getProviderStates",
    clients: ["pactflow", "pact_broker"]
  },
  {
    title: "Can I Deploy",
    summary: "Performs a comprehensive compatibility check to determine whether a specific version of a service (pacticipant) can be safely deployed into a given environment. It analyzes the complete contract matrix of consumer-provider relationships to confirm that all required integrations are verified and compatible.",
    purpose: "To serve as a deployment safety check within the PactBroker and PactFlow ecosystem, leveraging contract testing results to validate whether a specific service / pacticipant version is compatible with all integrated services. This feature prevents unsafe releases, reduces integration risks, and enables teams to confidently automate deployments across environments with a clear, auditable record of verification results.",
    zodSchema: CanIDeploySchema,
    handler: "canIDeploy",
    clients: ["pactflow", "pact_broker"]
  },
  {
    title: "Matrix",
    summary: "Retrieve the comprehensive contract verification matrix that shows the relationship between consumer and provider versions, their associated pact files, and verification results stored in the Pact Broker or Pactflow. The matrix provides detailed visibility into which consumer and provider versions have been successfully verified against each other, and highlights failures with detailed information about the cause.",
    purpose: "The Matrix serves as a powerful tool for teams to understand the state of their contract testing ecosystem. It enables tracking of all interactions between consumer and provider versions over time, with detailed insights into verification successes and failures. This helps teams rapidly identify compatibility issues, understand why specific verifications failed, and make informed decisions about deployments. Matrix offers a more intuitive and consolidated view of the verification status, making it easier to spot trends or problematic versions. Additionally, the Matrix supports complex queries using selectors, and can answer specific 'can-i-deploy' questions, ensuring that only compatible versions are deployed to production environments.",
    useCases: [
      "Quickly identify which consumer and provider version combinations have passed or failed verification.",
      "Diagnose and investigate why a particular consumer-provider verification failed.",
      "Visualize the overall contract compatibility across two pacticipants / services.",
      "Perform advanced queries using selectors to understand compatibility within specific branches, environments, or version ranges.",
      "Support informed deployment decisions by answering 'can I deploy version X of this service to production?'",
      "Expose contract verification details to non-frequent API users in a more accessible format."
    ],
    zodSchema: MatrixSchema,
    handler: "getMatrix",
    clients: ["pactflow", "pact_broker"]
  },
  {
    title: "PactFlow AI Credits",
    summary: "Check PactFlow AI usage status, remaining credits, and eligibility",
    purpose: "Retrieve the AI feature status for the PactFlow account, including whether AI is enabled, the number of remaining and consumed AI credits, and entitlement or permission issues preventing usage.",
    useCases: [
      "Verify if AI functionality is enabled for the account before attempting to use AI-powered features",
      "Monitor remaining and consumed AI credits to manage usage and avoid unexpected disruptions",
      "Detect entitlement or permission issues when a user tries to access AI features and guide corrective actions",
      "Integrate into deployment pipelines to ensure the environment is correctly configured with necessary entitlements and sufficient credits before executing AI-driven tasks",
      "Fetches usage and entitlement reports for auditing, budgeting, and compliance purposes"
    ],
    handler: "getAICredits",
    clients: ["pactflow"]
  }
];
