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
  RefineInputSchema
} from "./ai.js";

export type ClientType = "pactflow" | "pact_broker";

export interface PactflowToolParams extends ToolParams {
  handler: string;
  clients: ClientType[]; 
  formatResponse?: (result: any) => any;
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
  },
  {
    title: "Review Pact Tests",
    summary: "Review Pact tests using PactFlow AI. You can provide the following inputs: (1) Pact tests to be reviewed along with metadata",
    purpose: "Review Pact tests for API interactions",
    zodSchema: RefineInputSchema,
    handler: "review",
    clients: ["pactflow"]
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
  }
];
