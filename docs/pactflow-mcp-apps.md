# PactFlow MCP Apps integration

How PactFlow tools render interactive UIs inside MCP hosts (SEP-1865 "MCP Apps").

## 1. Build pipeline

```mermaid
flowchart LR
    subgraph SRC["Source (src/pactflow/client/apps)"]
        TSX["browser/*.tsx<br/>React apps: integrations-graph,<br/>result-explorer, deployment-matrix,<br/>bdct-verification, ..."]
        MAIN["browser/main.tsx<br/>picks App by body[data-app]"]
        RT["browser/runtime.tsx<br/>AppRuntimeProvider + useAppRuntime"]
        SH["browser/shared.tsx<br/>css, Shell, appData()"]
        TSX --> MAIN
        RT --> MAIN
        SH --> TSX
    end

    VA["vite.apps.config.ts<br/>(IIFE lib build)"]
    BUNDLE[("dist/mcp-apps/index.js<br/>single JS bundle<br/>react + react-dom + d3-force")]
    VM["vite.config.ts<br/>(server build)"]
    DIST[("dist/index.js + dist/pactflow/...")]

    MAIN --> VA --> BUNDLE
    APPDEF["apps/*.ts<br/>McpAppParams {resourceUri, title,<br/>description, html}"] --> VM --> DIST
    RES["apps/resource.ts<br/>createPactFlowAppHtml(appId)"] --> APPDEF
    BUNDLE -. "read at resource request time" .-> RES

    NPM["npm run build"] --> VA
    NPM --> VM
```

`html` is either a lazy function (`createPactFlowAppHtml("<id>")`, which inlines the bundle into a self-contained
`<!doctype html>` document with `<body data-app="<id>">`) or, for `result-explorer.ts`, a self-contained HTML string.

## 2. Server-side registration

```mermaid
flowchart TB
    TOOLS["pactflow/client/tools.ts<br/>TOOLS[] : PactflowToolParams<br/>{ title, handler, inputSchema,<br/>app?, formatResponse?, paginated? }"]
    MAP[".map(tool => ({...tool,<br/>app: tool.app ?? PACTFLOW_RESULT_EXPLORER_APP}))<br/>generic explorer is the fallback for every tool"]
    TOOLS --> MAP

    subgraph PC["PactClient.registerTools (pactflow/client.ts)"]
        direction TB
        H["handlerMap[handler](args)<br/>(ContractApi, PacticipantApi, ...)"]
        PAG["withPagination()<br/>cache + slice -> { ..., pagination }"]
        FR["formatResponse(result)<br/>-> { content, structuredContent, _meta.contractTesting }"]
        META["_meta.contractTesting =<br/>{ ...formatResponse meta,<br/>result, args,<br/>tool: { title, handler } }"]
        H --> PAG --> FR --> META
    end

    subgraph SRV["SmartBearMcpServer (common/server.ts)"]
        direction TB
        REG["registerTool(name, {..., _meta.ui.resourceUri})"]
        RAR["registerAppResource(app)<br/>mimeType text/html;profile=mcp-app<br/>(once per resourceUri)"]
        NAME["after callback:<br/>contractTesting.tool.name = registered tool name<br/>(so the app can call the tool again)"]
    end

    MAP --> PC
    PC --> SRV
    REG --> RAR
    META --> NAME
```

## 3. Runtime: tool call to rendered UI

```mermaid
sequenceDiagram
    autonumber
    participant U as User / LLM
    participant H as MCP Host (iframe sandbox)
    participant S as MCP Server (SmartBear)
    participant P as PactFlow API
    participant A as MCP App (React, in iframe)

    U->>H: calls a PactFlow tool
    H->>S: tools/list
    S-->>H: tool + _meta.ui.resourceUri (ui://contract-testing/...)
    H->>S: tools/call (name, args)
    S->>P: HTTP request(s)
    P-->>S: JSON / HAL
    S-->>H: result { content, structuredContent,<br/>_meta.contractTesting {result, args, tool.name, ...} }
    H->>S: resources/read ui://contract-testing/<app>
    S-->>H: self-contained HTML (inlined bundle)
    H->>A: render sandboxed iframe
    A->>H: ui/initialize
    H-->>A: hostContext (theme, style variables)
    A->>H: ui/notifications/initialized
    H->>A: ui/notifications/tool-input { arguments }
    H->>A: ui/notifications/tool-result { _meta.contractTesting }
    A->>A: useAppRuntime().result -> appData(result, key) -> render
    A->>H: ui/notifications/size-changed

    opt in-app interaction (pagination, search across pages)
        A->>H: tools/call { name: tool.name, arguments: {...args, pageNumber} }
        H->>S: tools/call
        S-->>H: new result
        H-->>A: response -> render next page
    end
```

## 4. Tool to app mapping

```mermaid
flowchart LR
    subgraph T["PactFlow tools"]
        t1["Get Provider States"]
        t2["Can I Deploy"]
        t3["Matrix"]
        t4["Get Branch BDCT Summary"]
        t5["Get Currently Deployed Versions<br/>Get Currently Supported Versions"]
        t6["Get BDCT * Verification Results<br/>(6 BDCT tools)"]
        t7["Visualize Integrations"]
        t8["Get Pacticipant Network"]
        t9["All other tools<br/>(List Pacticipants, admin, webhooks, ...)"]
    end

    subgraph A["MCP Apps (ui://contract-testing/...)"]
        a1["provider-states"]
        a2["deployment-matrix"]
        a3["branch-bdct-summary"]
        a4["environment-inventory"]
        a5["bdct-verification"]
        a6["integrations-graph<br/>team-grouped network, status colours,<br/>drag/zoom/search, node detail panel"]
        a7["pacticipant-network"]
        a8["result-explorer<br/>generic: item table, detail rows,<br/>page-by-page navigation, search"]
    end

    t1 --> a1
    t2 --> a2
    t3 --> a2
    t4 --> a3
    t5 --> a4
    t6 --> a5
    t7 --> a6
    t8 --> a7
    t9 --> a8
```

## 5. `integrations-graph` data flow

```mermaid
flowchart TB
    TOOL["Visualize Integrations<br/>(handler: getIntegrationsNetwork, optional consumer filter)"]
    FETCH["integrations-network.ts<br/>fetchIntegrationsNetwork(http)"]

    TOOL --> FETCH
    FETCH --> I["GET /integrations<br/>Accept: application/hal+json<br/>-> consumer/provider pairs + verificationModes<br/>(DOT fallback parser)"]
    FETCH --> PD["GET /pacticipants/{name} x N<br/>teams, labels, mainBranch,<br/>latestVersion, timestamps"]
    FETCH --> MX["GET /matrix?q[]pacticipant=C&q[]latest=true<br/>&q[]pacticipant=P&latestby=cvp x M<br/>success/failed/unknown + versions + verifiedAt"]

    PD --> BN
    MX --> BN
    I --> BN
    BN["buildNetwork()<br/>assignGroups: team -> team-name prefix -> shared prefix -> Other<br/>status: failed | verified | unverified<br/>mapLimit concurrency 8, caps 150 nodes / 300 edges"]

    BN --> OUT["{ nodes, edges, summary, warnings? }"]
    OUT --> FMT["formatResponse -> _meta.contractTesting.integrationsNetwork"]
    FMT --> UI

    subgraph UI["browser/integrations-graph.tsx"]
        direction TB
        L["buildLayout: d3-force<br/>group packing, link/charge/collide,<br/>containment force"]
        V["SVG: group hulls, curved status edges,<br/>flowing dots, sized/coloured nodes, BDCT rings"]
        I2["interactions: drag+pin, pan/zoom, hover focus,<br/>search, group chips, failing-only, isolate"]
        D["side panel: status, teams, labels, versions,<br/>connects-to / used-by with per-link status"]
        L --> V --> I2 --> D
    end
```

## 6. `result-explorer` (generic fallback) behaviour

```mermaid
flowchart TB
    R["_meta.contractTesting.result<br/>(+ args, tool.name, pagination)"] --> SHAPE{"shape?"}
    SHAPE -- "array / _embedded.* / array prop" --> TABLE["item table<br/>up to 6 scalar columns,<br/>click row -> JSON detail"]
    SHAPE -- "single object" --> KV["key/value card +<br/>collapsible nested sections"]
    TABLE --> PG{"pagination present?"}
    PG -- yes --> NAV["Previous / Next<br/>-> tools/call with pageNumber"]
    TABLE --> SEARCH["search all pages<br/>(re-fetch with large pageSize)"]
    KV --> RAW["Raw JSON toggle / Copy"]
    TABLE --> RAW
```

## 7. Key files

| Concern | File |
| --- | --- |
| Tool definitions, app assignment, `formatAppResponse` | `src/pactflow/client/tools.ts` |
| Tool registration, pagination wrapper, `_meta.contractTesting` | `src/pactflow/client.ts`, `src/pactflow/client/pagination.ts` |
| App resource registration, tool name injection | `src/common/server.ts` (`registerAppResource`) |
| App definitions (`McpAppParams`) | `src/pactflow/client/apps/*.ts`, `src/common/types.ts` |
| Bundle embedding | `src/pactflow/client/apps/resource.ts` |
| React apps and host runtime (JSON-RPC over `postMessage`) | `src/pactflow/client/apps/browser/*.tsx` |
| Network data builder | `src/pactflow/client/integrations-network.ts` |
| Bundle build config | `vite.apps.config.ts`, `package.json` (`build`) |
