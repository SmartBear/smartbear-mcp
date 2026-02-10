import { App } from "@modelcontextprotocol/ext-apps";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import "./ListProjects.css";
import { AppContext } from "./appContext";

const ListProjects = lazy(() => import("./ListProjects"));

const contentDiv = document.getElementById("container");
if (!contentDiv) {
  throw new Error("Could not find container element");
}
const reactRoot = createRoot(contentDiv);

const app = new App({
  name: "BugSnag MCP App",
  version: "0.0.1",
});

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
        <Router toolId={toolId} data={data} />
      </Suspense>
    </AppContext>,
  );
};

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
