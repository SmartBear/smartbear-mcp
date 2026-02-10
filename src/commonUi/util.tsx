import { App } from "@modelcontextprotocol/ext-apps";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { type ComponentType, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { AppContext } from "../bugsnag/ui/AppContext";

interface McpAppConfig {
  name: string;
  version: string;
  RootComponent: ComponentType<{ toolId: string; data: CallToolResult }>;
}

/**
 * Helper function to set up an MCP app with React
 *
 * A meta tag with the tool id is expected mcp-tool-id.
 */
export function createMcpApp(config: McpAppConfig) {
  const { name, version, RootComponent } = config;

  const app = new App({ name, version });

  const contentDiv = document.getElementById("container");
  if (!contentDiv) {
    throw new Error("Could not find container element");
  }
  const reactRoot = createRoot(contentDiv);

  app.connect();

  app.ontoolresult = (data) => {
    // get the tool that was initially called and rendered the app
    const toolId = document
      .querySelector('meta[name="mcp-tool-id"]')
      ?.getAttribute("content");
    if (!toolId) {
      throw new Error("Could not find mcp-tool-id meta tag");
    }

    reactRoot.render(
      <AppContext value={app}>
        <Suspense>
          <RootComponent toolId={toolId} data={data} />
        </Suspense>
      </AppContext>,
    );
  };
}

/**
 * Get the result of a tool call, assuming the content is text and contains JSON
 */
export function getToolResult<T>(toolResult: CallToolResult): T {
  const content = toolResult.content.find((c) => c.type === "text");
  if (!content) {
    throw new Error(
      `Expected text content, but got ${toolResult.content[0].type}`,
    );
  }
  return JSON.parse(content.text) as T;
}
