#!/usr/bin/env node
import "./common/register-clients.js"; // Register all available clients
import bugsnag, {
  getTracer,
  startBugsnag,
  startPerformanceTelemetry,
} from "./common/bugsnag.js";
import { getTransportMode } from "./common/config.js";
import { runHttpMode } from "./common/transport-http.js";
import { runStdioMode } from "./common/transport-stdio.js";

// Enable BugSnag error and performance monitoring if the MCP_SERVER_BUGSNAG_API_KEY environment variable is set
startBugsnag();
startPerformanceTelemetry();

async function main() {
  bugsnag.startSession();
  getTracer().startActiveSpan("startup", async (span) => {
    span.setAttribute("bugsnag.span.first_class", true);

    const transportMode = getTransportMode();
    if (transportMode === "http") {
      console.log("[MCP] Starting in HTTP mode...");
      await runHttpMode();
    } else if (transportMode === "stdio") {
      bugsnag.leaveBreadcrumb("[MCP] Starting in stdio mode...");
      await runStdioMode();
    } else {
      console.error(
        `[MCP] Invalid transport mode: ${transportMode}. Use "stdio" or "http".`,
      );
      span.recordException(new Error("Invalid transport mode"));
      process.exit(1);
    }
    span.end();
  });
}

await main();
