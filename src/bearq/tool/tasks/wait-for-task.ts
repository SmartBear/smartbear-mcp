import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShape } from "zod";
import { z } from "zod";
import { Tool, ToolError } from "../../../common/tools.ts";
import type { ToolParams } from "../../../common/types.ts";
import type { BearqClient } from "../../client.ts";

const inputSchema = z.object({
  taskId: z.number().int().positive().describe("BearQ task ID."),
});

const SSE_EVENT_PREFIX_LENGTH = "event:".length;
const SSE_DATA_PREFIX_LENGTH = "data:".length;

function parseFrame(frame: string): { event: string; data: string } | null {
  let event = "";
  let data = "";
  for (const line of frame.split("\n")) {
    if (!line.startsWith(":")) {
      if (line.startsWith("event:")) {
        event = line.slice(SSE_EVENT_PREFIX_LENGTH).trim();
      } else if (line.startsWith("data:")) {
        data = line.slice(SSE_DATA_PREFIX_LENGTH).trim();
      }
    }
  }
  if (!(event && data)) {
    return null;
  }
  return { event, data };
}

interface StreamEvent {
  event: string;
  data: unknown;
}

interface ConsumeFramesResult {
  buffer: string;
  terminal: boolean;
}

/**
 * Parses and processes any complete SSE frames currently in `buffer`, pushing
 * each to `events` and notifying progress. Returns the leftover (incomplete)
 * buffer plus whether a terminal ("done" or "timeout") event was seen.
 */
async function consumeFrames(
  initialBuffer: string,
  events: StreamEvent[],
  notify: (event: string, data: unknown) => Promise<void>,
): Promise<ConsumeFramesResult> {
  let buffer = initialBuffer;
  let boundary = buffer.indexOf("\n\n");
  while (boundary !== -1) {
    const frame = buffer.slice(0, boundary);
    buffer = buffer.slice(boundary + 2);
    boundary = buffer.indexOf("\n\n");
    const parsed = parseFrame(frame);
    if (parsed) {
      const data = JSON.parse(parsed.data);
      events.push({ event: parsed.event, data });
      // biome-ignore lint/performance/noAwaitInLoops: progress notifications must be sent in the same order events occur
      await notify(parsed.event, data);
      if (parsed.event === "done" || parsed.event === "timeout") {
        return { buffer, terminal: true };
      }
    }
  }
  return { buffer, terminal: false };
}

export class WaitForTask extends Tool<BearqClient> {
  specification: ToolParams = {
    title: "Wait For Task",
    toolset: "Tasks",
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
    if (!res.ok) {
      throw new ToolError(
        `GET /tasks/${taskId}/stream failed: ${res.status} ${res.statusText}`,
      );
    }
    if (!res.body) {
      throw new ToolError(`GET /tasks/${taskId}/stream: no response body`);
    }

    const progressToken = extra?._meta?.progressToken;
    let progress = 0;
    const notify = async (event: string, data: unknown) => {
      if (progressToken === undefined) {
        return;
      }
      progress += 1;
      await extra.sendNotification({
        method: "notifications/progress",
        params: {
          progressToken,
          progress,
          message: JSON.stringify({ event, data }),
        },
      });
    };

    const events: StreamEvent[] = [];

    const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
    let buffer = "";

    try {
      // biome-ignore lint/suspicious/noUnnecessaryConditions: intentional infinite read loop, terminated by the `break` on `done`
      while (true) {
        // biome-ignore lint/performance/noAwaitInLoops: stream chunks must be read in order; each read depends on the previous one
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        buffer += value;

        const result = await consumeFrames(buffer, events, notify);
        ({ buffer } = result);
        if (result.terminal) {
          return {
            content: [{ type: "text", text: JSON.stringify({ events }) }],
          };
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
