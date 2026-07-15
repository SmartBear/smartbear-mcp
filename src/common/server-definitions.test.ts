import { describe, expect, it, vi } from "vitest";
import { SmartBearMcpServer } from "./server.ts";

import "./register-clients.ts";
import type { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { clientRegistry } from "./client-registry.ts";

// outputSchema/inputSchema may be a raw shape (plain object of Zod fields) or a
// full Zod object schema (e.g. z.looseObject) — normalize to a sorted list of
// field names either way so the snapshot reflects the schema's shape, not its
// runtime representation.
function schemaFieldNames(schema: unknown): string[] | undefined {
  if (!schema) {
    return;
  }
  const shape =
    (schema as { shape?: Record<string, unknown> }).shape ??
    (schema as Record<string, unknown>);
  return Object.keys(shape).sort();
}

/**
 * This test verifies that all registered tools, prompts, and resources from all clients match the expected snapshot.
 * If it fails, verify the diff from the vitest output and, if it's expected, update the snapshot with `vitest -u`.
 */
describe("server definitions are not changed unexpectedly", () => {
  it("registered tools", async () => {
    const server = new SmartBearMcpServer();

    const registeredTools: Record<string, unknown> = {};

    // The real `registerTool` overload set is a complex generic API; this spy
    // deliberately replaces it with an intentionally loose signature purely to
    // capture registration calls for snapshotting.
    vi.spyOn(
      Object.getPrototypeOf(Object.getPrototypeOf(server)),
      "registerTool",
    ).mockImplementation(((
      toolName: string,
      config: Record<string, unknown>,
    ) => {
      registeredTools[toolName] = {
        ...config,
        inputSchema: schemaFieldNames(config.inputSchema),
        outputSchema: schemaFieldNames(config.outputSchema),
      };
      // biome-ignore lint/suspicious/noExplicitAny: intentionally loose spy signature, see comment above
    }) as any);

    for (const client of clientRegistry.getAll()) {
      // biome-ignore lint/performance/noAwaitInLoops: sequential registration order required
      await server.addClient(client);
    }

    const sorted = Object.fromEntries(
      Object.entries(registeredTools).sort(([a], [b]) => a.localeCompare(b)),
    );

    expect(sorted).toMatchSnapshot();
  });
  it("registered prompts", async () => {
    const server = new SmartBearMcpServer();

    const registeredPrompts: Record<string, unknown> = {};

    vi.spyOn(
      Object.getPrototypeOf(Object.getPrototypeOf(server)),
      "registerPrompt",
    ).mockImplementation(((
      promptName: string,
      config: { argsSchema?: Record<string, unknown> },
    ) => {
      registeredPrompts[promptName] = {
        ...config,
        argsSchema: config.argsSchema
          ? Object.keys(config.argsSchema).sort()
          : undefined,
      };
      // biome-ignore lint/suspicious/noExplicitAny: see comment above vi.spyOn
    }) as any);

    for (const client of clientRegistry.getAll()) {
      // biome-ignore lint/performance/noAwaitInLoops: sequential registration order required
      await server.addClient(client);
    }

    const sorted = Object.fromEntries(
      Object.entries(registeredPrompts).sort(([a], [b]) => a.localeCompare(b)),
    );

    expect(sorted).toMatchSnapshot();
  });
  it("registered resources", async () => {
    const server = new SmartBearMcpServer();

    const registeredResources: Record<string, unknown> = {};

    vi.spyOn(
      Object.getPrototypeOf(Object.getPrototypeOf(server)),
      "registerResource",
    ).mockImplementation(((
      resourceName: string,
      template: ResourceTemplate,
      config: Record<string, unknown>,
    ) => {
      registeredResources[resourceName] = {
        // @ts-expect-error
        url: template.uriTemplate.template,
        variables: template.uriTemplate.variableNames,
        ...config,
      };
      // biome-ignore lint/suspicious/noExplicitAny: see comment above vi.spyOn
    }) as any);

    for (const client of clientRegistry.getAll()) {
      // biome-ignore lint/performance/noAwaitInLoops: sequential registration order required
      await server.addClient(client);
    }

    const sorted = Object.fromEntries(
      Object.entries(registeredResources).sort(([a], [b]) =>
        a.localeCompare(b),
      ),
    );

    expect(sorted).toMatchSnapshot();
  });
});
