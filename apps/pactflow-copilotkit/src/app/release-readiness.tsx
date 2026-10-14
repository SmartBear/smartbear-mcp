"use client";

import { CopilotSidebar, useDefaultRenderTool } from "@copilotkit/react-core/v2";

function ToolActivity() {
  useDefaultRenderTool({
    render: ({ name, status }) => (
      <div className="tool-activity">
        <span className={`tool-dot ${status === "complete" ? "complete" : ""}`} />
        <span>{status === "complete" ? "Completed" : "Gathering evidence"}</span>
        <strong>{name.replaceAll("_", " ")}</strong>
      </div>
    ),
  });

  return null;
}

export function ReleaseReadiness() {
  return (
    <main className="workspace">
      <ToolActivity />
      <section className="intro">
        <p className="eyebrow">SmartBear MCP + CopilotKit</p>
        <h1>PactFlow contract explorer</h1>
        <p>
          Ask for an integration graph or a branch BDCT summary. The agent invokes
          the corresponding PactFlow tool and opens its interactive MCP App.
        </p>
      </section>
      <section className="suggestions" aria-label="Suggested prompts">
        <span>Visualize PactFlow integrations.</span>
        <span>Show the contract network graph.</span>
        <span>Show the BDCT summary for smartbear-mcp&apos;s top 5 branches.</span>
      </section>
      <CopilotSidebar defaultOpen />
    </main>
  );
}
