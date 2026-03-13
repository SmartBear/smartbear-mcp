import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { lazy } from "react";
import "./ListProjects.css";
import { createMcpApp } from "../../commonUi/util";

const ListProjects = lazy(() => import("./ListProjects"));

createMcpApp({
  name: "BugSnag MCP App",
  version: "0.0.1",
  RootComponent: Router,
});

/**
 * Based on the tool that was called, render the appropriate component.
 *
 * The routes should be imported lazily.
 */
function Router({ toolId, data }: { toolId: string; data: CallToolResult }) {
  switch (toolId) {
    case "list-projects":
      return <ListProjects data={data} />;
    default:
      throw new Error(`Unknown tool ID: ${toolId}`);
  }
}
