import { z } from "zod";
import { ToolError } from "../../../common/tools";
import type { ReflectClient } from "../../client";
import { API_HOSTNAME } from "../../config/constants";

/**
 * Shared support for the "create test" and "create segment" tools.
 */
const BASE_STEP_TYPES = [
  "click",
  "text-validation",
  "input",
  "submit",
  "scroll",
  "focus",
  "hover",
  "drag-and-drop",
  "text-highlight",
  "browser-navigate",
  "browser-back",
  "browser-forward",
  "browser-refresh",
  "api",
  "javascript",
  "appium",
  "prompt",
  "update-parameters",
  "wait",
  "receive-email",
  "receive-sms",
  "rotate-device",
  "reset-device",
  "deeplink",
  "set-device-location",
] as const;

// Tests may additionally reference an existing segment as a step; segments cannot.
const TEST_STEP_TYPES = ["segment", ...BASE_STEP_TYPES] as const;

const headerSchema = z.object({
  name: z.string().describe("Header name."),
  value: z.string().describe("Header value."),
});

const parameterSchema = z.object({
  name: z.string().describe("Parameter name."),
  value: z.string().optional().describe("Default value for the parameter."),
});

const emailFilterSchema = z.object({
  fromAddress: z
    .string()
    .optional()
    .describe("Only match emails sent from this address."),
  fromName: z
    .string()
    .optional()
    .describe("Only match emails sent from this sender name."),
  subject: z
    .string()
    .optional()
    .describe("Only match emails with this subject."),
  toAddress: z
    .string()
    .optional()
    .describe("Only match emails sent to this address."),
});

const emailSchema = z.object({
  text: z
    .string()
    .optional()
    .describe("Text to extract from, or validate against, the matched email."),
  filters: emailFilterSchema.describe(
    "Filters selecting which inbound email this step waits for.",
  ),
});

const smsFilterSchema = z.object({
  fromNumber: z
    .string()
    .optional()
    .describe("Only match SMS messages sent from this number."),
  toNumber: z
    .string()
    .optional()
    .describe("Only match SMS messages sent to this number."),
});

const smsSchema = z.object({
  text: z
    .string()
    .optional()
    .describe("Text to extract from, or validate against, the matched SMS."),
  filters: smsFilterSchema
    .optional()
    .describe("Filters selecting which inbound SMS this step waits for."),
});

function buildStepSchema(
  stepTypes: readonly [string, ...string[]],
  { includeSegmentReference }: { includeSegmentReference: boolean },
) {
  return z.object({
    type: z
      .enum(stepTypes)
      .describe(
        "The kind of step to perform. Determines which of the other fields are required.",
      ),
    description: z
      .string()
      .optional()
      .describe(
        "Human-readable description of the step. For 'prompt' steps, this field holds the natural-language instruction to execute.",
      ),
    selector: z
      .string()
      .optional()
      .describe(
        "CSS selector of the target element. Used by 'click', 'input', 'submit', 'scroll', 'focus', 'hover', 'text-validation', 'text-highlight', and the source element of 'drag-and-drop'.",
      ),
    tag: z
      .string()
      .optional()
      .describe("Tag name of the target element (e.g. 'button', 'input')."),
    toSelector: z
      .string()
      .optional()
      .describe(
        "CSS selector of the destination element for a 'drag-and-drop' step.",
      ),
    toTag: z
      .string()
      .optional()
      .describe(
        "Tag name of the destination element for a 'drag-and-drop' step.",
      ),
    inputText: z
      .string()
      .optional()
      .describe("Text to type. Used by 'input' steps."),
    url: z
      .string()
      .optional()
      .describe(
        "Target URL. Required by 'api' steps; used as the navigation URL for 'browser-navigate' and as the deep link for 'deeplink'.",
      ),
    script: z
      .string()
      .optional()
      .describe("JavaScript source to execute. Used by 'javascript' steps."),
    command: z
      .string()
      .optional()
      .describe("Appium command to run. Required by 'appium' steps."),
    argument: z
      .string()
      .optional()
      .describe("Argument for the Appium command in an 'appium' step."),
    httpMethod: z
      .string()
      .optional()
      .describe(
        "HTTP method for an 'api' step (e.g. 'GET', 'POST'). Defaults to 'GET'.",
      ),
    requestBody: z
      .string()
      .optional()
      .describe("Request body for an 'api' step."),
    requestHeaders: z
      .array(headerSchema)
      .optional()
      .describe("Request headers for an 'api' step."),
    followRedirects: z
      .boolean()
      .optional()
      .describe("Whether an 'api' step should follow HTTP redirects."),
    email: emailSchema
      .optional()
      .describe("Configuration for a 'receive-email' step."),
    sms: smsSchema
      .optional()
      .describe("Configuration for a 'receive-sms' step."),
    expectedText: z
      .string()
      .optional()
      .describe(
        "Text expected on the page. Used by 'text-validation' steps, which require an exact match of the target element's text (not a substring or case-insensitive match).",
      ),
    title: z
      .string()
      .optional()
      .describe(
        "Expected page title for a navigation step ('browser-navigate', 'browser-back', 'browser-forward', 'browser-refresh').",
      ),
    expectedResult: z
      .string()
      .optional()
      .describe("Expected result text for a 'prompt' step."),
    promptType: z
      .enum(["action", "assert", "query"])
      .optional()
      .describe(
        "The kind of AI 'prompt' step (required for 'prompt' steps): 'action' performs an action; 'assert' checks a condition; 'query' answers a question. Prompt steps only take into account what is currently visible on the screen.",
      ),
    expectedResponse: z
      .union([z.boolean(), z.string()])
      .optional()
      .describe(
        "Expected response for a 'prompt' step: a boolean for an 'assert' prompt, or a string for a 'query' prompt.",
      ),
    latitude: z
      .number()
      .optional()
      .describe("Latitude for a 'set-device-location' step."),
    longitude: z
      .number()
      .optional()
      .describe("Longitude for a 'set-device-location' step."),
    seconds: z
      .number()
      .optional()
      .describe("Number of seconds to pause. Used by 'wait' steps."),
    // Only tests can reference segments, so this field is omitted from segment steps.
    ...(includeSegmentReference
      ? {
          id: z
            .number()
            .optional()
            .describe(
              "Id of the segment to reference. Required for 'segment' steps.",
            ),
        }
      : {}),
    name: z.string().optional().describe("Optional display name for the step."),
    parameters: z
      .array(parameterSchema)
      .optional()
      .describe(
        "Parameter name/value assignments applied by an 'update-parameters' step.",
      ),
  });
}

export function buildCreateDefinitionSchema({
  isSegment,
}: {
  isSegment: boolean;
}) {
  const definitionType = isSegment ? "segment" : "test";

  const stepSchema = buildStepSchema(
    isSegment ? BASE_STEP_TYPES : TEST_STEP_TYPES,
    { includeSegmentReference: !isSegment },
  );
  const selectorGuidance =
    "Prefer deterministic, selector-based steps ('click', 'input', 'submit', 'text-validation', 'hover', etc.) " +
    "over AI-driven 'prompt' steps whenever a stable selector is available. Reserve 'prompt' steps for behavior that " +
    "can't be expressed with a selector.";

  const referenceGuidance =
    `Any text field in a step (e.g. 'inputText', 'url', 'expectedText', 'requestBody', header values, prompt text) ` +
    `may embed Reflect variable and function references using '\${...}' syntax, which are resolved at run time: ` +
    `'\${var(name)}' inserts the value of a parameter/variable named 'name' (declare parameters via the top-level ` +
    `'parameters' field, or assign them mid-run with an 'update-parameters' step); '\${sec(name)}' inserts the value ` +
    `of the account secret 'name'. Functions generate dynamic values: '\${alphanum(n)}', '\${alpha(n)}', '\${num(n)}' ` +
    `(random alphanumeric / alphabetic / numeric string of length n), '\${range(min, max)}' (random integer, ` +
    `inclusive), '\${time(offsetMs)}' and '\${datetime(offsetMs)}' (current epoch-millis / date-time, with an optional ` +
    `millisecond offset), and '\${date(format, offsetDays)}' (current date formatted with tokens like 'MM/dd/yyyy', ` +
    `with an optional day offset).`;

  const stepsDescription = isSegment
    ? `Ordered list of steps that make up the segment. Segments cannot reference other segments. ${selectorGuidance} ${referenceGuidance}`
    : `Ordered list of steps that make up the test. Web tests must begin with a 'browser-navigate' step. ${selectorGuidance} ${referenceGuidance}`;

  return z.object({
    name: z.string().describe(`Name of the ${definitionType} to create.`),
    type: z
      .enum(["web", "api", "native-mobile"])
      .describe(`Platform of the ${definitionType}.`),
    description: z
      .string()
      .optional()
      .describe(`Optional description of the ${definitionType}.`),
    deviceProfile: z
      .string()
      .optional()
      .describe(
        `Device profile id. Required for a 'web' ${definitionType}; ignored for 'api' and 'native-mobile'. One of: 'desktop', 'tablet', 'mobile'.`,
      ),
    steps: z.array(stepSchema).describe(stepsDescription),
    parameters: z
      .array(parameterSchema)
      .optional()
      .describe(
        `Optional named parameters (variables) for the ${definitionType}, each with a 'name' and optional default 'value'. Reference a parameter's value inside any step text field with '\${var(name)}'.`,
      ),
  });
}

// Reflect's API returns errors as { message, errorId }
async function readErrorMessage(response: Response): Promise<string> {
  try {
    const text = await response.text();
    if (!text) {
      return "";
    }
    try {
      const parsed = JSON.parse(text) as { message?: string };
      return parsed.message ? `: ${parsed.message}` : `: ${text}`;
    } catch {
      return `: ${text}`;
    }
  } catch {
    return "";
  }
}

export async function createReflectDefinition(
  client: ReflectClient,
  endpoint: "tests" | "segments",
  noun: "test" | "segment",
  body: unknown,
) {
  const response = await fetch(`https://${API_HOSTNAME}/v1/${endpoint}`, {
    method: "POST",
    headers: client.getHeaders(),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const detail = await readErrorMessage(response);
    throw new ToolError(
      `Failed to create ${noun}: ${response.status} ${response.statusText}${detail}`,
    );
  }

  const data = (await response.json()) as { id: number };
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify({
          success: true,
          id: data.id,
          message: `Created ${noun} with id ${data.id}`,
        }),
      },
    ],
  };
}
