import { describe, expect, it, vi } from "vitest";
import { SmartBearMcpServer } from "../../../common/server";

import "../../../common/register-clients";
import { clientRegistry } from "../../../common/client-registry";

/**
 * This test verifies that all registered tools from all clients match the expected snapshot.
 * If it fails, verify the diff from the vitest output and, if it's expected, update the snapshot with `vitest -u`.
 */
describe("tool definitions", () => {
  it("all registered tool definitions match the snapshot", async () => {
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
});
