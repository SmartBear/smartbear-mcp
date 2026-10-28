# Drift MCP plugin tests for the PactFlow integration

These tests verify the PactFlow tools (and prompt) that this server exposes, using the
[Drift MCP plugin](https://support.smartbear.com/swagger/contract-testing/docs/en/drift/plugins/mcp-plugin.html).
They sit alongside the Pact consumer tests (`npm run test:pact`), which cover the
server's calls to PactFlow APIs; these cover what the server offers to MCP clients.

| File | Purpose |
| --- | --- |
| `pactflow.mcp.yaml` | The MCP definition (contract) of the PactFlow tools and prompt. **Generated**, do not edit. |
| `pactflow.testcases.yaml` | Hand-written Drift test cases: the surface check (`drift/all`) and tool calls with content, tool-error and invalid-argument assertions. |
| `pactflow.tools.testcases.yaml` | **Generated**, do not edit. One call per remaining tool, with arguments built from its input schema, so every PactFlow tool is invoked and its result validated against its `outputSchema`. |
| `mock-pactflow.mjs` | Minimal mock of the PactFlow API the tools call. |

## Running

```sh
npm install -g @pactflow/drift
drift component install mcp   # the MCP plugin is optional and in beta

npm run build
export PACT_BROKER_BASE_URL=... PACT_BROKER_TOKEN=...   # Drift authenticates with PactFlow
npm run test:drift
```

`scripts/drift-verify.mjs` starts the mock, launches `node dist/index.js` over stdio
pointed at it, and runs `drift verify` with strict settings: a PactFlow tool or
description that differs from the definition fails the run.

## Publishing to PactFlow

CI (`.github/workflows/drift.yml`) publishes the definition and the Drift results as a
provider contract for `smartbear-mcp` (specification `mcp`) with
`scripts/ci/drift-publish-provider-contract`, even when the tests fail (the exit code is
passed through) and then fails the job. Publishing is skipped for forks and Dependabot,
which have no secrets. To publish by hand:

```sh
npm run test:drift -- --output-dir drift-results --generate-result
DRIFT_EXIT_CODE=$? GITHUB_SHA=<version> GITHUB_REF_NAME=<branch> \
  scripts/ci/drift-publish-provider-contract   # needs PACT_BROKER_BASE_URL / PACT_BROKER_TOKEN
```

PactFlow stores the `mcp` specification as published and does not compare it with consumer
contracts, so it cannot satisfy a can-i-deploy check; it is available through the API.

## When you change a PactFlow tool

Rebuild and regenerate the definition and the generated calls, then review the diff:

```sh
npm run build && npm run drift:generate
```

Generate it from a clean `npm ci` install: the advertised JSON Schema depends on the installed
`zod` and MCP SDK versions (a stale `node_modules` once produced a definition that failed in CI).

## Adding a test

Every tool already gets a generated call. To assert more about one, add an operation to
`pactflow.testcases.yaml` (the generator then skips that tool) targeting `pactflow:tool/<tool name>`,
with inputs under `parameters.arguments`, and add any endpoint it needs to
`mock-pactflow.mjs` (unknown routes get an empty `200 {}`, so only tools that need
a specific body or status, such as 204 for deletes, have fixtures). Assert `expected.result.structuredContent` for results or
`expected.result.isError: true` for tool errors. Drift also validates each result
against the tool's `outputSchema` automatically.

## Notes

- Running against a real PactFlow tenant instead of the mock? Drift tags operations for tools
  with `destructiveHint: true` as `destructive`, but does not exclude them for you:
  `npm run test:drift -- --tags '!destructive'`.
- This definition covers the whole PactFlow surface (every tool is invoked), unlike the
  curated 22-tool definition in Drift's own `Examples/smartbear-mcp`, which governs only the
  capabilities an agent is authorised to use.
- Drift's MCP plugin compares schemas shallowly (top-level `required`, the property names and
  each property's `type`), so a tightened nested constraint is not caught by the surface check.
  `execution.taskSupport` is not modelled. Results are checked against an `outputSchema` only
  when a test invokes the tool, which is why every tool has a call.
- Invalid arguments come back as a tool error (`isError: true`); the MCP specification puts
  schema violations in the JSON-RPC error channel (`-32602`). The tests assert the observed
  behaviour and say so.

- Drift cannot authenticate to an MCP server, so tests use the stdio transport and give the
  server its settings (pointing at the mock) through its own environment only.
- Drift itself authenticates with PactFlow on every run: set `PACT_BROKER_BASE_URL` and
  `PACT_BROKER_TOKEN` (CI uses the repository secrets) or run `drift auth login` once.
  Without either it stops with "Could not initialise the authentication config".
- The PactFlow AI tools are advertised only when PactFlow's AI entitlement check succeeds;
  the mock enables it so the definition covers the full surface.
