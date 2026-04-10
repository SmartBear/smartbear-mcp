import yaml from "js-yaml";
// @ts-expect-error missing type declarations
import Swagger from "swagger-client";
import { ToolError } from "../../common/tools";
import {
  type EndpointMatcher,
  type OpenAPI,
  type RemoteOpenAPIDocument,
  RemoteOpenAPIDocumentSchema,
} from "./ai";

/**
 * Builds a URL query string from an object, omitting undefined values.
 *
 * @param params - Key-value pairs to encode. Undefined values are omitted.
 * @returns A query string starting with `?`, or `""` if all values are undefined.
 */
export function toQueryString(
  params: Record<string, string | number | boolean | undefined>,
): string {
  const entries = Object.entries(params).filter(
    (entry): entry is [string, string | number | boolean] =>
      entry[1] !== undefined,
  );
  if (!entries.length) return "";
  const qs = new URLSearchParams(entries.map(([k, v]) => [k, String(v)]));
  return `?${qs.toString()}`;
}

/**
 * Resolve the OpenAPI specification from the provided input.
 *
 * @param remoteOpenAPIDocument The remote OpenAPI document to resolve.
 * @returns The resolved OpenAPI document.
 * @throws Error if the resolution fails.
 */
export async function resolveOpenAPISpec(
  remoteOpenAPIDocument: RemoteOpenAPIDocument,
): Promise<OpenAPI> {
  const openAPISchema = RemoteOpenAPIDocumentSchema.safeParse(
    remoteOpenAPIDocument,
  );
  if (openAPISchema.error || !remoteOpenAPIDocument) {
    throw new ToolError(
      `Invalid RemoteOpenAPIDocument: ${JSON.stringify(
        openAPISchema.error?.issues,
      )}`,
    );
  }

  const unresolvedSpec = await getRemoteSpecContents(openAPISchema.data);
  const resolvedSpec = await Swagger.resolve({ spec: unresolvedSpec });

  if (resolvedSpec.errors?.length) {
    throw new ToolError(
      `Failed to resolve OpenAPI document: ${resolvedSpec.errors?.join(", ")}`,
    );
  }

  return resolvedSpec.spec;
}

/**
 * Fetch the contents of a remote OpenAPI document.
 *
 * @param openAPISchema The schema for the remote OpenAPI document.
 * @returns A promise that resolves to the parsed OpenAPI document contents.
 * @throws Error if the URL is not provided or the fetch fails.
 */
export async function getRemoteSpecContents(
  openAPISchema: RemoteOpenAPIDocument,
): Promise<unknown> {
  if (!openAPISchema.url) {
    throw new ToolError("'url' must be provided.");
  }

  let headers = {};
  if (openAPISchema.authToken) {
    headers = {
      Authorization: `${openAPISchema.authScheme ?? "Bearer"} ${
        openAPISchema.authToken
      }`,
    };
  }

  const remoteSpec = await fetch(openAPISchema.url, {
    headers,
    method: "GET",
  });

  const specRawBody = await remoteSpec.text();

  try {
    return JSON.parse(specRawBody);
  } catch (jsonError) {
    try {
      return yaml.load(specRawBody);
    } catch (yamlError) {
      const isStdioTransport =
        process.env.MCP_TRANSPORT?.toLowerCase() === "stdio";

      if (isStdioTransport) {
        throw new ToolError(
          `Unsupported Content-Type: ${remoteSpec.headers.get(
            "Content-Type",
          )} for remote OpenAPI document. Found following parse errors:-\nJSON parse error: ${jsonError}\nYAML parse error: ${yamlError}`,
        );
      }

      throw new ToolError(
        `Failed to parse remote OpenAPI document. Ensure the URL returns valid JSON or YAML content.`,
      );
    }
  }
}

interface OpenAPIWithMatcherRaw {
  document?: OpenAPI;
  matcher?: EndpointMatcher;
  remoteDocument?: RemoteOpenAPIDocument;
}

/**
 * Adds the OpenAPI specification to the input schema if a remote document is provided.
 *
 * @param inputSchema The input schema to modify.
 * @returns The modified input schema with the OpenAPI specification added.
 */
export async function addOpenAPISpecToSchema(
  inputSchema: OpenAPIWithMatcherRaw,
): Promise<OpenAPIWithMatcherRaw> {
  if (inputSchema.remoteDocument) {
    const resolvedSpec = await resolveOpenAPISpec(inputSchema.remoteDocument);
    inputSchema.document = resolvedSpec;
  }

  return inputSchema;
}
