import { describe, expect, it, vi } from "vitest";
import { SmartBearMcpServer } from "./server";

import "./register-clients";
import type { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { clientRegistry } from "./client-registry";

/**
 * This test verifies that all registered tools, prompts, and resources from all clients match the expected snapshot.
 * If it fails, verify the diff from the vitest output and, if it's expected, update the snapshot with `vitest -u`.
 */
describe("server definitions are not changed unexpectedly", () => {
  it("registered tools", async () => {
    const server = new SmartBearMcpServer();

    const registeredTools: Record<string, any> = {};

    vi.spyOn(
      Object.getPrototypeOf(Object.getPrototypeOf(server)),
      "registerTool",
    ).mockImplementation(((toolName: string, config: any) => {
      registeredTools[toolName] = {
        ...config,
        inputSchema: config.inputSchema
          ? Object.keys(config.inputSchema).sort()
          : undefined,
        outputSchema: config.outputSchema
          ? Object.keys(config.outputSchema).sort()
          : undefined,
      };
    }) as any);

    for (const client of clientRegistry.getAll()) {
      await server.addClient(client);
    }

    const sorted = Object.fromEntries(
      Object.entries(registeredTools).sort(([a], [b]) => a.localeCompare(b)),
    );

    expect(sorted).toMatchSnapshot();
  });
  it("registered prompts", async () => {
    const server = new SmartBearMcpServer();

    const registeredPrompts: Record<string, any> = {};

    vi.spyOn(
      Object.getPrototypeOf(Object.getPrototypeOf(server)),
      "registerPrompt",
    ).mockImplementation(((promptName: string, config: any) => {
      registeredPrompts[promptName] = {
        ...config,
        argsSchema: config.argsSchema
          ? Object.keys(config.argsSchema).sort()
          : undefined,
      };
    }) as any);

    for (const client of clientRegistry.getAll()) {
      await server.addClient(client);
    }

    const sorted = Object.fromEntries(
      Object.entries(registeredPrompts).sort(([a], [b]) => a.localeCompare(b)),
    );

    expect(sorted).toMatchSnapshot();
  });
  it("registered resources", async () => {
    const server = new SmartBearMcpServer();

    const registeredResources: Record<string, any> = {};

    vi.spyOn(
      Object.getPrototypeOf(Object.getPrototypeOf(server)),
      "registerResource",
    ).mockImplementation(((
      resourceName: string,
      template: ResourceTemplate,
      config: any,
    ) => {
      registeredResources[resourceName] = {
        // @ts-expect-error
        url: template.uriTemplate.template,
        variables: template.uriTemplate.variableNames,
        ...config,
      };
    }) as any);

    for (const client of clientRegistry.getAll()) {
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
