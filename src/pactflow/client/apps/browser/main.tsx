import { createRoot } from "react-dom/client";
import { BdctVerification } from "./bdct-verification";
import { BranchBdctSummary } from "./branch-bdct-summary";
import { DeploymentMatrix } from "./deployment-matrix";
import { EnvironmentInventory } from "./environment-inventory";
import { IntegrationsGraph } from "./integrations-graph";
import { PacticipantNetwork } from "./pacticipant-network";
import { ProviderStates } from "./provider-states";
import { ResultExplorer } from "./result-explorer";
import { AppRuntimeProvider } from "./runtime";
import { css } from "./shared";

const apps: Record<string, React.ComponentType> = {
  "bdct-verification": BdctVerification,
  "branch-bdct-summary": BranchBdctSummary,
  "deployment-matrix": DeploymentMatrix,
  "environment-inventory": EnvironmentInventory,
  "integrations-graph": IntegrationsGraph,
  "pacticipant-network": PacticipantNetwork,
  "provider-states": ProviderStates,
  "result-explorer": ResultExplorer,
};
const id = document.body.dataset.app;
const App = id ? apps[id] : undefined;
document.head.append(
  Object.assign(document.createElement("style"), { textContent: css }),
);
createRoot(document.getElementById("root")!).render(
  App && id ? (
    <AppRuntimeProvider name={`pactflow-${id}`}>
      <App />
    </AppRuntimeProvider>
  ) : (
    <main>Unknown PactFlow MCP App.</main>
  ),
);
