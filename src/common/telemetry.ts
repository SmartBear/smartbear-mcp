import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { NodeSDK } from "@opentelemetry/sdk-node";
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from "@opentelemetry/semantic-conventions";
import { MCP_SERVER_VERSION } from "./info.js";

export function startTelemetry(apiKey: string) {
  const sdk = new NodeSDK({
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: "smartbear-mcp-server",
      [ATTR_SERVICE_VERSION]: MCP_SERVER_VERSION,
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
