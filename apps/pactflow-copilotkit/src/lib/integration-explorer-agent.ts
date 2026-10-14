import {
  AbstractAgent,
  EventType,
  type BaseEvent,
  type RunAgentInput,
} from "@ag-ui/client";
import { Observable } from "rxjs";

const INTEGRATIONS_TOOL = "contract-testing_visualize_integrations";
const BRANCH_BDCT_SUMMARY_TOOL = "contract-testing_get_branch_bdct_summary";

function latestUserText(input: RunAgentInput) {
  const message = [...input.messages].reverse().find(({ role }) => role === "user");

  if (!message || typeof message.content !== "string") {
    return "";
  }

  return message.content;
}

function requestedPacticipant(query: string) {
  return query.match(/\b(?:for|of)\s+([a-z0-9._-]+)/i)?.[1] ?? "smartbear-mcp";
}

export class IntegrationExplorerAgent extends AbstractAgent {
  run(input: RunAgentInput): Observable<BaseEvent> {
    return new Observable<BaseEvent>((subscriber) => {
      const { threadId, runId } = input;
      const messageId = crypto.randomUUID();
      const toolCallId = crypto.randomUUID();
      const query = latestUserText(input);
      const isIntegrationRequest = /integration|network|graph/i.test(query);
      const isBranchBdctRequest =
        /\b(branch|branches)\b/i.test(query) && /\b(bdct|bi[- ]?directional|cross[- ]?contract)\b/i.test(query);
      const requestedLimit = query.match(/\btop\s+(\d+)|\b(\d+)\s+branches?\b/i);
      const branchLimit = Number(requestedLimit?.[1] ?? requestedLimit?.[2] ?? 5);
      const pacticipantName = requestedPacticipant(query);

      subscriber.next({ type: EventType.RUN_STARTED, threadId, runId });

      if (!isIntegrationRequest && !isBranchBdctRequest) {
        subscriber.next({
          type: EventType.TEXT_MESSAGE_START,
          messageId,
          role: "assistant",
        });
        subscriber.next({
          type: EventType.TEXT_MESSAGE_CONTENT,
          messageId,
          delta: "Ask to visualize PactFlow integrations or show a provider's branch BDCT summary.",
        });
        subscriber.next({ type: EventType.TEXT_MESSAGE_END, messageId });
        subscriber.next({ type: EventType.RUN_FINISHED, threadId, runId });
        subscriber.complete();
        return;
      }

      subscriber.next({
        type: EventType.TEXT_MESSAGE_START,
        messageId,
        role: "assistant",
      });
      subscriber.next({
        type: EventType.TEXT_MESSAGE_CONTENT,
        messageId,
        delta: isBranchBdctRequest
          ? "Loading branch BDCT verification results."
          : "Loading the PactFlow integration graph.",
      });
      subscriber.next({ type: EventType.TEXT_MESSAGE_END, messageId });
      subscriber.next({
        type: EventType.TOOL_CALL_START,
        toolCallId,
        toolCallName: isBranchBdctRequest
          ? BRANCH_BDCT_SUMMARY_TOOL
          : INTEGRATIONS_TOOL,
        parentMessageId: messageId,
      });
      subscriber.next({
        type: EventType.TOOL_CALL_ARGS,
        toolCallId,
        delta: isBranchBdctRequest
          ? JSON.stringify({ pacticipantName, limit: Math.min(Math.max(branchLimit, 1), 10) })
          : "{}",
      });
      subscriber.next({ type: EventType.TOOL_CALL_END, toolCallId });
      subscriber.next({ type: EventType.RUN_FINISHED, threadId, runId });
      subscriber.complete();
    });
  }
}
