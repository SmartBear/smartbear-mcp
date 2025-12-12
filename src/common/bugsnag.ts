import * as os from "node:os";

// workaround for a known issue with Bugsnag types in node16 modules: https://github.com/bugsnag/bugsnag-js/issues/2052
import * as Bugsnag from "@bugsnag/js";
export default Bugsnag.default as unknown as typeof Bugsnag.default.default;

import { trace } from "@opentelemetry/api";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { NodeSDK } from "@opentelemetry/sdk-node";
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from "@opentelemetry/semantic-conventions";
import {
  getBugsnagApiKey,
  getReleaseStage,
  getServerVersion,
  getTransportMode,
} from "./config.js";

export function startBugsnag() {
  const apiKey = getBugsnagApiKey();
  if (!apiKey) {
    return;
  }

  Bugsnag.default.default.start({
    apiKey,
    appType: getTransportMode(),
    appVersion: getServerVersion(),
    enabledBreadcrumbTypes: ["log"],
    logger: null, // Disable logging to avoid console output confusing the MCP protocol
    releaseStage: getReleaseStage(),
    enabledReleaseStages: ["production"],
  });
}

export function startPerformanceTelemetry() {
  const apiKey = getBugsnagApiKey();
  if (!apiKey) {
    return;
  }

  const sdk = new NodeSDK({
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: "smartbear-mcp-server",
      [ATTR_SERVICE_VERSION]: getServerVersion(),
      "mcp.transport": getTransportMode(),
      "deployment.environment": getReleaseStage(),
      "os.name": os.platform(),
      "os.version": os.version(),
    }),
    traceExporter: new OTLPTraceExporter({
      url: `https://${apiKey}.otlp.bugsnag.com/v1/traces`,
    }),
    instrumentations: [getNodeAutoInstrumentations()],
  });

  sdk.start();

  process.on("SIGTERM", () => {
    sdk
      .shutdown()
      .then(() => console.log("Telemetry terminated"))
      .catch((error) => console.log("Error terminating telemetry", error));
  });
}

export function getTracer() {
  return trace.getTracer("smartbear-mcp-bugsnag");
}
