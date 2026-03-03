import { randomUUID } from "node:crypto";
import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShape } from "zod";
import { z } from "zod";
import { Tool, ToolError } from "../../../common/tools";
import type { ToolParams } from "../../../common/types";
import type { ReflectClient } from "../../client";

export class AddPromptStep extends Tool<ReflectClient> {
  specification: ToolParams = {
    title: "Add Prompt Step",
    summary:
      "Add a natural language prompt step to an active Reflect recording session",
    readOnly: false,
    idempotent: false,
    parameters: [
      {
        name: "sessionId",
        type: z.string(),
        description: "The ID of the Reflect recording session",
        required: true,
      },
      {
        name: "prompt",
        type: z.string(),
        description: `The natural prompt describing the test step. The prompt should describe a single action, assertion, or query. 
The prompt can only contain literal text; it cannot contain template variables, secrets, or other dynamic syntax. If we're in a Web recording,
the prompt can perform browser navigation (e.g. "Click on the back button", "Navigate to https://www.example.com") and use the tab and enter keys
to navigate (e.g. "Press the tab key", "Press the enter key").`,
        required: true,
      },
    ],
  };

  handle: ToolCallback<ZodRawShape> = async (args) => {
    const { sessionId, prompt } = args as {
      sessionId: string;
      prompt: string;
    };
    if (!sessionId) throw new ToolError("sessionId argument is required");
    if (!prompt) throw new ToolError("prompt argument is required");

    const wsManager = this.client.getConnectedSession(sessionId);

    const id = randomUUID();
    const responsePromise = wsManager.waitForResponse(id);
    await wsManager.sendMcpMessage({
      type: "mcp:add-prompt-step",
      id,
      prompt,
    });

    const response = (await responsePromise) as Record<string, unknown>;
    const result = response.result as Record<string, unknown> | undefined;

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            success: true,
            sessionId,
            message: `Successfully added prompt step: "${prompt}"`,
            intent: {
              prompt,
              type: result?.type as string | undefined,
              response: result?.response as string | boolean | undefined,
            },
          }),
        },
      ],
    };
  };
}
