import { ToolError } from "../common/tools";
import type {
  Client,
  GetInputFunction,
  RegisterPromptFunction,
  RegisterToolsFunction,
} from "../common/types";
import { PactflowAdminMethods } from "./client/admin-methods";
import { PactflowAiMethods } from "./client/ai-methods";
import {
  applyMixins,
  ConfigurationSchema,
  PactflowBaseClient,
} from "./client/base-client";
import { PactflowContractMethods } from "./client/contract-methods";
import { PactflowEnvironmentMethods } from "./client/environment-methods";
import { PactflowPacticipantMethods } from "./client/pacticipant-methods";
import { PROMPTS } from "./client/prompts";
import { PactflowSettingsMethods } from "./client/settings-methods";
import { TOOLS } from "./client/tools";

export class PactflowClient extends PactflowBaseClient implements Client {
  name = "Contract Testing";
  toolPrefix = "contract-testing";
  configPrefix = "Pact-Broker";
  config = ConfigurationSchema;

  /**
   * Registers tools with the provided register function.
   *
   * @param register - The function used to register tools.
   * @param getInput - The function used to get input for tools.
   */
  async registerTools(
    register: RegisterToolsFunction,
    getInput: GetInputFunction,
  ): Promise<void> {
    let disablePactflowAItools = false;
    try {
      const entitlement = await this.checkAIEntitlements();
      if (!entitlement.aiEnabled) {
        disablePactflowAItools = true;
      }
    } catch (error) {
      if (
        error instanceof ToolError &&
        error.metadata?.get("responseStatus") === 404
      ) {
        disablePactflowAItools = true;
      }
    }

    for (const tool of TOOLS.filter(
      (t) => !this._clientType || t.clients.includes(this._clientType),
    )) {
      if (
        tool.tags &&
        disablePactflowAItools &&
        tool.tags.includes("pactflow-ai")
      ) {
        continue;
      }

      const { handler, clients: _, formatResponse, ...toolparams } = tool;
      register(toolparams, async (args, _extra) => {
        const self = this as Record<string, unknown>;
        const handler_fn = self[handler];
        if (typeof handler_fn !== "function") {
          throw new Error(`Handler '${handler}' not found on PactClient`);
        }

        type HandlerFn = (...fnArgs: unknown[]) => Promise<unknown>;
        let result: unknown;
        if (tool.enableElicitation) {
          result = await (handler_fn as HandlerFn).call(this, args, getInput);
        } else {
          result = await (handler_fn as HandlerFn).call(this, args);
        }

        if (formatResponse) {
          return formatResponse(result);
        }

        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      });
    }
  }

  /**
   * Registers prompts with the provided register function.
   *
   * @param register - The function used to register prompts.
   */
  registerPrompts(register: RegisterPromptFunction): void {
    PROMPTS.forEach((prompt) => {
      register(prompt.name, prompt.params, prompt.callback);
    });
  }
}

// Merge all method group types onto PactflowClient
export interface PactflowClient
  extends PactflowAiMethods,
    PactflowPacticipantMethods,
    PactflowEnvironmentMethods,
    PactflowContractMethods,
    PactflowSettingsMethods,
    PactflowAdminMethods {}

// Copy prototype methods from each group onto PactflowClient at runtime
applyMixins(PactflowClient, [
  PactflowAiMethods,
  PactflowPacticipantMethods,
  PactflowEnvironmentMethods,
  PactflowContractMethods,
  PactflowSettingsMethods,
  PactflowAdminMethods,
]);
