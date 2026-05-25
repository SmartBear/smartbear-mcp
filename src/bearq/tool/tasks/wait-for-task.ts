import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShape } from "zod";
import { z } from "zod";
import { Tool, ToolError } from "../../../common/tools";
import type { ToolParams } from "../../../common/types";
import type { BearQClient } from "../../client";

const inputSchema = z.object({
  taskId: z.number().int().positive().describe("BearQ task ID."),
});

function parseFrame(frame: string): { event: string; data: string } | null {
  let event = "";
  let data = "";
  for (const line of frame.split("\n")) {
    if (line.startsWith(":")) continue;
    if (line.startsWith("event:")) event = line.slice(6).trim();
    else if (line.startsWith("data:")) data = line.slice(5).trim();
  }
  if (!event || !data) return null;
  return { event, data };
}

export class WaitForTask extends Tool<BearQClient> {
  specification: ToolParams = {
    title: "Wait For Task",
    summary:
      "Blocks until a BearQ task reaches a terminal state (completed / failed / cancelled) or the stream times out, then returns the full ordered sequence of SSE events from the public API (metadata, activityLogEntries, and a terminal done or timeout event) verbatim. Blocks for the lifetime of the task — for a quick check use bearq_get_task_status instead.",
    inputSchema,
  };

  handle: ToolCallback<ZodRawShape> = async (args, extra) => {
    const { taskId } = inputSchema.parse(args);
    const url = `${this.client.getBaseUrl()}/tasks/${taskId}/stream`;
    const res = await fetch(url, {
      headers: { ...this.client.getHeaders(), Accept: "text/event-stream" },
    });
    if (!res.ok)
      throw new ToolError(
        `GET /tasks/${taskId}/stream failed: ${res.status} ${res.statusText}`,
      );
    if (!res.body)
      throw new ToolError(`GET /tasks/${taskId}/stream: no response body`);

    const progressToken = extra?._meta?.progressToken;
    let progress = 0;
    const notify = async (event: string, data: unknown) => {
      if (progressToken === undefined) return;
      await extra.sendNotification({
        method: "notifications/progress",
        params: {
          progressToken,
          progress: ++progress,
          message: JSON.stringify({ event, data }),
        },
      });
    };

    const events: { event: string; data: unknown }[] = [];

    const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += value;

        let boundary = buffer.indexOf("\n\n");
        while (boundary !== -1) {
          const frame = buffer.slice(0, boundary);
          buffer = buffer.slice(boundary + 2);
          boundary = buffer.indexOf("\n\n");
          const parsed = parseFrame(frame);
          if (!parsed) continue;

          const data = JSON.parse(parsed.data);
          events.push({ event: parsed.event, data });
          await notify(parsed.event, data);

          if (parsed.event === "done" || parsed.event === "timeout") {
            return {
              content: [{ type: "text", text: JSON.stringify({ events }) }],
            };
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    throw new ToolError(
      `GET /tasks/${taskId}/stream closed without a done or timeout event`,
    );
  };
}
