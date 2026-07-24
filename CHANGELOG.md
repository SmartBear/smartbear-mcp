# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Unreleased

### Added

- [Swagger] Added `create_test` Functional Testing tool that creates a new API test with set of steps.

## [0.32.0] - 2026-07-23

### Added

- [QTM4J] Added test execution tools to start executions, update test case and step executions. [#604](https://github.com/SmartBear/smartbear-mcp/pull/604)
- [QTM4J] Added API request tracking. [#604](https://github.com/SmartBear/smartbear-mcp/pull/604)

### Fixed

- [QTM4J] Fixed `search_test_cases` response validation errors when test case fields are missing. [#604](https://github.com/SmartBear/smartbear-mcp/pull/604)

## [0.31.0] - 2026-07-16

### Changed

- [BearQ] Remove draft-test refinement tools and add `bearq_delete_test_cases` [#593](https://github.com/SmartBear/smartbear-mcp/pull/593)
- [Zephyr] Refactor to keep REST API schemas unmodified and ensure correct payload for update operations [#609](https://github.com/SmartBear/smartbear-mcp/pull/609)

### Fixed

- [Swagger] Adjusted some of the Swagger Functional Testing tools responses to return `url` of test or test Suite execution.

## [0.30.0] - 2026-07-16

### Added

- [Swagger] Added output schemas to Swagger Portal and Registry tools, enabling structured, validated responses for all portal, product, section, document, table-of-contents, and registry operations.
- [Swagger] Introduced tool constants (`READ_ONLY`, `WRITE`, `WRITE_DESTRUCTIVE`) to annotate each Swagger tool with semantic flags (`readOnly`, `openWorld`, `destructive`) for better client-side tool classification.
- [Swagger] Added `get_test_history` Functional Testing tool that retrieves the execution history for a given test, returning past runs with pass/fail status, run time, creation timestamp, and per-step failure details for failed runs.

### Changed

- [Pactflow] Replaced the static `USER_AGENT` constant with a dynamic `getUserAgent()` call in `PactflowClient.requestHeaders`, ensuring the outbound `User-Agent` header always includes the identified MCP client name and version. Removed the `SOURCE_APPLICATION` header.

- [Reflect] Add create_test and create_segment tools to enable agents to port tests from open source frameworks (Selenium, Cypress, Playwright) and other SmartBear products (TestComplete, BearQ) to Reflect.

- [Swagger] Refactor error handling for Functional Testing tools

### Fixed

- [Pactflow] Corrected MCP tool hint annotations for all 102 PactFlow tools. Previously, `readOnlyHint` defaulted to `true` for every tool because no tool explicitly set `readOnly`, causing write/delete operations to be misreported as read-only. All tools now declare all four hints explicitly: `readOnly` (58 read-only, 44 write), `destructive` (true for DELETE ops, `resetAdminRoles`, and `regenerateToken`), `idempotent` (false for creates, records, patch, execute, and invite operations), and `openWorld` (true for `executeWebhook`, `executeWebhooks`, and `inviteUsers` which trigger external HTTP requests or send emails).
- [Swagger] Added a conditional required-field rule to the `create_table_of_contents` tool's `content` schema so `url` is structurally required only when `content.type` is `apiUrl`, instead of relying solely on prose descriptions. Addresses an "Unclear Arguments" flag from ChatGPT app review while keeping `content` as a flat object for manual tool testing.
- [Swagger] Fixed a client-side "data should NOT have additional properties" validation error shown for tools like `get_portal_product` that return extra fields (e.g. `role`, `createdAt`, `updatedAt`) not modeled in their output schema. The MCP server now advertises the intended `additionalProperties: true` for these loosely-typed output schemas instead of losing that setting during tool registration. [#553](https://github.com/SmartBear/smartbear-mcp/pull/553)

### Security

- [Swagger] Prevented organization admin email addresses from being exposed through the `list_organizations` tool. Introduced `OrganizationListItem` type that omits the `email` field, filtered organization list data at the MCP boundary, and updated the output schema and documentation accordingly.

## [0.29.0] - 2026-07-13

### Changed

- [Common] Co-located all unit test files with their source files (`path/to/file.ts` → `path/to/file.test.ts`), removing the top-level `src/tests/unit/` directory. Updated `vitest.config.ts` include/exclude globs and coverage excludes accordingly.

### Security

- [Common] Upgraded `libcrypto3` and `libssl3` Alpine packages from `3.5.6-r0` to `3.5.7-r0` in the Docker release image to address CVE-2026-34182 (CRITICAL), CVE-2026-45447 (HIGH), CVE-2026-7383 (HIGH), and CVE-2026-45445 (HIGH) [#572](https://github.com/SmartBear/smartbear-mcp/pull/572)

- [Common] Capture MCP client identity (`clientInfo.name`/`version`) from the `initialize` handshake and store it in the session context. The normalized client name and version are forwarded on the outbound User-Agent for all downstream API requests and attached to BugSnag event metadata, enabling usage attribution by originating MCP client (Claude, Cursor, Copilot Studio, etc.) without client-side changes [#532](https://github.com/SmartBear/smartbear-mcp/pull/532)
- [Zephyr] Update Zephyr Schemas - Change ComponentID min in Create Test Case to 1 [#574](https://github.com/SmartBear/smartbear-mcp/pull/574)

### Fixed

- [Pactflow] Fixed CDCT failures: removed `deployable` from the `can-i-deploy` summary matcher (the API legitimately returns `null` when no verification result exists between integrated services, not a boolean) and removed the `PUT /webhooks/{id}` consumer interaction which fails provider-side UUID validation due to the 16-character minimum enforced by the webhook contract. [#578](https://github.com/SmartBear/smartbear-mcp/pull/578)

- [Pactflow] Fixed consumer pact tests for AI generate and review endpoints: updated both interactions to expect `202 Accepted` with a `StatusResponse` body (`status`, `session_id`, `submitted_at`, `status_url`, `result_url`) instead of a synchronous `200` response, matching the async job pattern the `pactflow-ai-api` provider now uses.

### Added

- [Pactflow] Added Pact V4 consumer contract tests covering PactflowClient HTTP interactions, with a dedicated CI pipeline that publishes pacts to PactFlow and gates on CDCT verification. Tests cover can-i-deploy, matrix, pacticipants, environments, deployments, webhooks, secrets, labels, admin users/teams/roles, system accounts, API tokens, BDCT endpoints, and more. Fixed `setTeamUsers` request body key (`uuids` → `users`) to match the provider API contract.

- [Swagger] Extended Swagger Functional Testing integration with `run_suite`, and `get_suite_status` tools for executing available suites and querying their execution.

- [Swagger] Added `list_suite_executions` tool for reviewing the execution history and timings of a test suite in your Swagger Functional Testing workspace. Requires `SWAGGER_FUNCTIONAL_TESTING_API_TOKEN` env var.

- [Swagger] Added `cancel_suite_execution` tool for stopping an ongoing test suite execution in your Swagger Functional Testing workspace. Requires `suiteId` and `executionId`. Requires `SWAGGER_FUNCTIONAL_TESTING_API_TOKEN` env var.

- [BearQ] Add environment targeting to the run tools and a `bearq_list_environments` tool [#565](https://github.com/SmartBear/smartbear-mcp/pull/565)

## [0.28.0] - 2026-07-07

### Changed

- [Pactflow]: Send the MCP client's name and version to Pactflow via a `SOURCE_APPLICATION` header on requests, captured from the client info supplied in the MCP `initialize` request. [#556](https://github.com/SmartBear/smartbear-mcp/pull/556)

### Added

- [Swagger] `create_documentation_page` now accepts an optional `pageSlug` parameter. When provided, it is used as the page URL slug; otherwise the slug is generated from the page title.
- [Swagger] Added `list_suites` tool for discovering test suites in your Swagger Functional Testing workspace. Requires `SWAGGER_FUNCTIONAL_TESTING_API_TOKEN` env var.

### Fixed

- [Zephyr] Fixed `get_test_case_steps` returning a schema validation error [#543](https://github.com/SmartBear/smartbear-mcp/pull/543)
- [Zephyr] Update Zephyr schemas [#562](https://github.com/SmartBear/smartbear-mcp/pull/562)

## [0.27.2] - 2026-07-01
- [CI] Extracted publishing of the standalone `com.smartbear/swagger-mcp` registry entry (`server.swagger.json`) into a dedicated, manually triggered `publish-swagger-mcp.yaml` workflow (`workflow_dispatch`), removing those steps from the main `publish.yaml`. [#554](https://github.com/SmartBear/smartbear-mcp/pull/554)

## [0.27.1] - 2026-06-29
- [Swagger]: Removed the https://swagger.mcp.smartbear.com/mcp streamable-http remote from the remotes array in server.json.[#550](https://github.com/SmartBear/smartbear-mcp/pull/550)
## [0.27.0] - 2026-06-29
- [Qmetry]: add Test Run UDF workflow support and customer fixes [#538](https://github.com/SmartBear/smartbear-mcp/pull/538)

### Added

- [Swagger] Extended `publish_portal_product` to build published URLs dynamically from `SWAGGER_PORTAL_BASE_PATH`, support preview and section/table-of-contents paths, and return the resolved `liveUrl` or `previewUrl` plus product, portal, and table-of-contents metadata in the publish response. If `portal.customDomain` is present, the client now uses it as the full host without appending the portal UI suffix. For url generation product and portal details ar required and section and toc details are optional.
[#525](https://github.com/SmartBear/smartbear-mcp/pull/525)

- [Swagger] Add `create_documentation_page` tool to create a documentation page in a portal product in a single call. Supports `markdown` and `html` content types with `internal` or `external` source. Returns page details and a `draftUrl` to edit the page in the portal admin.

- [Swagger] Extended Swagger Functional Testing integration with `run_test`, and `get_test_status` tools for executing available API tests and querying their execution.

## [0.26.1] - 2026-06-24

### Fixed

- [Swagger] Register Portal/Studio tools when authenticated via OAuth. Previously only an explicit API key (`SWAGGER_API_KEY` / `Swagger-Api-Key` header) enabled the tools, so OAuth-only sessions listed no Swagger tools. [#537](https://github.com/SmartBear/smartbear-mcp/pull/537)

## [0.26.0] - 2026-06-19

### Added

- [Swagger] Add `scan_api_standardization_from_registry` tool to fetch and scan an API definition from the registry, returning results with total issue count and counts by severity [#510](https://github.com/SmartBear/smartbear-mcp/pull/510)
- [Swagger] Add Swagger Functional Testing integration with `list_tests` tool for discovering available API tests. Requires `SWAGGER_FUNCTIONAL_TESTING_API_TOKEN` env var.
- [Swagger] Added `Resolve Organization Portal` tool to find or create a portal for an organization. [#526](https://github.com/SmartBear/smartbear-mcp/pull/526)
- [Common] Added transport mode (stdio/http) to User-Agent header for all API requests [#517](https://github.com/SmartBear/smartbear-mcp/pull/517)
- [Collaborator] Add user agent header to API requests [#517](https://github.com/SmartBear/smartbear-mcp/pull/517)
- [Reflect] Added `get_test_detail` tool for retrieving full test details including name, description, and all recorded steps [#524](https://github.com/SmartBear/smartbear-mcp/pull/524)

## [0.25.1] - 2026-06-08

### Fixed

- [Common] Reverted [#487](https://github.com/SmartBear/smartbear-mcp/pull/487) due to request scoping issue. [#512](https://github.com/SmartBear/smartbear-mcp/pull/512)

## [0.25.0] - 2026-06-03

### Added
- [Common] Add `MCP_TOOLSETS` environment variable to allow tools to be grouped into sets for better organization and client control [#474](https://github.com/SmartBear/smartbear-mcp/pull/474)
- [Common] Split authorization and configuration options to better suit OAuth flow [#487](https://github.com/SmartBear/smartbear-mcp/pull/487)
- [QTM4J] Added support for linking and unlinking requirements, test cases, and test cycles through new tools. [#505](https://github.com/SmartBear/smartbear-mcp/pull/505)
- [QTM4J] Added tools for retrieving linked requirements and test cases across requirements, test cases, and test cycles. [#505](https://github.com/SmartBear/smartbear-mcp/pull/505)

## [0.24.0] - 2026-05-28

### Added

- [QTM4J] Added test cycle management capabilities, including create, search, and update operations. [#501](https://github.com/SmartBear/smartbear-mcp/pull/501)
- [QTM4J] Added test automation capabilities, including automation result uploads and import history retrieval. [#501](https://github.com/SmartBear/smartbear-mcp/pull/501)

### Fixed

- [PactFlow] Remove `.email()` Zod validator from PactFlow admin user tool schemas — the generated JSON Schema pattern used regex lookahead which is rejected by strict JSON Schema validators (e.g. OpenAI gpt-5.5) [#491](https://github.com/SmartBear/smartbear-mcp/issues/491)
- [BearQ] Fix BearQ integration page not appearing in live docs [#496](https://github.com/SmartBear/smartbear-mcp/pull/496)
- [Swagger]  Add constraint in the create_portal tool schema description, that allows only one Portal per organization.

## [0.23.0] - 2026-05-22

### Added

- [BearQ] Add BearQ integration with 11 tools for AI-powered QA: run regression tests, run/refine test cases and functional areas, expand the application model, chat with the QA lead agent, and manage async tasks (`get_task`, `get_task_status`, `wait_for_task`, `stop_task`) [#485](https://github.com/SmartBear/smartbear-mcp/pull/485)

## [0.22.0] - 2026-05-21

### Fixed

- [Common] Only advertise prompts and resources capabilities when provided by clients [#480](https://github.com/SmartBear/smartbear-mcp/pull/480)

## [0.21.1] - 2026-05-20

### Added

- [QTM4J] Add QTM4J (QMetry Test Management for Jira) capabilities to MCP [#476](https://github.com/SmartBear/smartbear-mcp/pull/476)

## [0.20.0] - 2026-05-15

### Added
- [Common] Add graceful shutdown on SIGTERM/SIGINT in HTTP mode: drains active sessions (closes Streamable HTTP and SSE transports, runs per-client `cleanupSession` hooks including Reflect WebSocket teardown), with a configurable deadline via `MCP_SHUTDOWN_TIMEOUT_MS` (default 25s) [#455](https://github.com/SmartBear/smartbear-mcp/pull/455)
- [Common] Split health/readiness probes: `GET /health` is now liveness-only and always returns 200 when the process is responsive; `GET /ready` is the readiness probe and returns 503 during drain so load balancers stop routing new sessions to draining pods. Both probes set `Cache-Control: no-store`. [#455](https://github.com/SmartBear/smartbear-mcp/pull/455)
- [Common] Add product prefix to registered resources and prompts [#458](https://github.com/SmartBear/smartbear-mcp/pull/458)

### Fixed

- [Common] Streamable HTTP requests carrying an `MCP-Session-Id` the server doesn't recognize now return `404` (with a JSON-RPC error envelope, code `-32001`) instead of `400`. This aligns with the MCP Streamable HTTP spec's Session Management rules, which require a 404 for requests against a terminated session and oblige clients to respond by sending a fresh `InitializeRequest`. In multi-pod deployments this lets clients transparently re-initialize after a pod restart or routing reshuffle drops the in-memory session, instead of treating it as a permanent protocol error. [#449](https://github.com/SmartBear/smartbear-mcp/pull/449)
- [Common] Configuration options can now be passed in via query string parameters for HTTP transport [#453](https://github.com/SmartBear/smartbear-mcp/pull/453)
- [Swagger] Remove unused `role` parameter from the `create_portal_product` tool. [#469](https://github.com/SmartBear/smartbear-mcp/pull/469)
- [Swagger] Portal API error responses now surface the human-readable reason instead of showing `HTTP 400:` with no message. The client reads the `application/problem+json` error body and extracts the `detail` field (RFC 7807); falls back to `message` if absent. [#468](https://github.com/SmartBear/smartbear-mcp/pull/468)
- [Pactflow][Collaborator] Reduced tool names under the apparent 64 character limit for Claude connectors [#470](https://github.com/SmartBear/smartbear-mcp/pull/470)
- [Pactflow] Fix bug that prevents MCP server from starting with no configuration (for tool exploration) [#445](https://github.com/SmartBear/smartbear-mcp/pull/445)

## [0.19.2] - 2026-05-05

- [Zephyr] fix Zephyr for Rovo Agent (avoid using nullish for update test case and update test cycle tools) [#442](https://github.com/SmartBear/smartbear-mcp/pull/442)

## [0.19.1] - 2026-05-04

### Added

- [Zephyr] Update Zephyr schemas for Rovo [#439](https://github.com/SmartBear/smartbear-mcp/pull/439)

## [0.19.0] - 2026-04-29

### Added

- [Reflect] Add jpeg format support for get-screenshot tool [#435](https://github.com/SmartBear/smartbear-mcp/pull/435)
- [Swagger] Added optional `newVersion` parameter to the `standardize_api` tool to save the fixed API definition as a new version instead of overwriting the current one

## [0.18.3] - 2026-04-16

### Added

- [Zephyr] Add zephyr custom base url for remote mcp config [#428](https://github.com/SmartBear/smartbear-mcp/pull/428)

## [0.18.2] - 2026-04-15

### Fixed

- [Common] Updated dependencies to address security vulnerabilities [#423](https://github.com/SmartBear/smartbear-mcp/pull/423)

## [0.18.1] - 2026-04-13

### Fixed

- [Common] Fixed an issue with configuring clients excessively when using stdio transport, only configure clients that have authentication provided [#421](https://github.com/SmartBear/smartbear-mcp/pull/421)

## [0.18.0] - 2026-04-10

### Added

- [Common] Added OAuth token support for HTTP transport clients. [#330](https://github.com/SmartBear/smartbear-mcp/pull/330)

### Changed

- [Portal] Adjusted internal script to recent changes in Portal's API [#404](https://github.com/SmartBear/smartbear-mcp/pull/404)

## [0.17.1] - 2026-04-09

### Added

- [Pactflow] Added tools for CRUD over BDCT, Pacticipants, Environments, Permissions management [#414](https://github.com/SmartBear/smartbear-mcp/pull/414)


## [0.17.0] - 2026-04-07

### Added

- [Zephyr] Added a tool `update-test-steps` for updating test execution test steps [#386](https://github.com/SmartBear/smartbear-mcp/pull/386)
- [BugSnag] Added "Get Events on an Error" tool for listing the events that have grouped into a specified error [#406](https://github.com/SmartBear/smartbear-mcp/pull/406)

### Changed

- [Zephyr] Added context to the `create-test-case` tool description about automatic empty test step creation. [#401](https://github.com/SmartBear/smartbear-mcp/pull/401)
- [Zephyr] Updated REST schemas - removed read-only fields from UpdateTestCase and UpdateTestCycle operations. [#407](https://github.com/SmartBear/smartbear-mcp/pull/407)

## [0.16.0] - 2026-03-25

### Added

- [Reflect] Added `list_segments` tool: Lists the reusable test steps in the account, and includes some relevant metadata about each segment to help the Agent understand when a segment could be used as part of accomplishing a task. [#369](https://github.com/SmartBear/smartbear-mcp/pull/369)
- [Reflect] Added `connect_to_session` tool: Establishes a WebSocket connection to a live Reflect test recording session. [#369](https://github.com/SmartBear/smartbear-mcp/pull/369)
- [Reflect] Added `add_prompt_step` tool: Adds a natural language instruction to the test. This could be a single action, assertion, or query. [#369](https://github.com/SmartBear/smartbear-mcp/pull/369)
- [Reflect] Added `get_screenshot` tool: Returns a screenshot of the current browser window (Web) or device (Mobile). The Agent is instructed to analyze the screenshot to determine the current state of the page and to decide what to do next to complete its assigned task. [#369](https://github.com/SmartBear/smartbear-mcp/pull/369)
- [Reflect] Added `delete_previous_step`: Performs an "undo" on a step or segment that was previously added. The Agent is instructed to use this tool when a step or segment that it has added has failed or did not perform the task as intended. [#369](https://github.com/SmartBear/smartbear-mcp/pull/369)
- [Reflect] Added `add_segment` tool: Adds an existing set of reusable test steps to the test. [#369](https://github.com/SmartBear/smartbear-mcp/pull/369)
- [Reflect] Updated "instructions" with guidance to the Agent on how to properly construct a Reflect test. [#369](https://github.com/SmartBear/smartbear-mcp/pull/369)
- [Reflect] Added a "reflect-sap-test" skill that includes additional guidance for the Agent when creating tests for SAP. [#369](https://github.com/SmartBear/smartbear-mcp/pull/369)

### Changed

- [Zephyr] Enforce strictness of Zephyr's schemas. [#383](https://github.com/SmartBear/smartbear-mcp/pull/383)
- [Zephyr] Allow the GetTestCaseLinks tool to return invalid-format URLs. [#397](https://github.com/SmartBear/smartbear-mcp/pull/397)

## [0.15.0] - 2026-03-18

### Added

- [Zephyr] Added a tool `create-issue-link` for creating a link between a Jira issue and a Test Case [#340](https://github.com/SmartBear/smartbear-mcp/pull/340)
- [Zephyr] Added a tool `create-folder` for creating folder [#329](https://github.com/SmartBear/smartbear-mcp/pull/329)
- [Zephyr] Added a tool `create-test-script` for creating Test Script [#328](https://github.com/SmartBear/smartbear-mcp/pull/328)
- [Zephyr] Added a tool `create-test-steps` for creating Test Steps for a Test Case [#353](https://github.com/SmartBear/smartbear-mcp/pull/353)
- [Zephyr] Added a tool `update-test-execution` for updating a test execution [#345](https://github.com/SmartBear/smartbear-mcp/pull/345)
- [Zephyr] Added a tool `create-test-cycle-issue-link` for creating a link between a Jira issue and a Test Cycle [#359](https://github.com/SmartBear/smartbear-mcp/pull/359)
- [Zephyr] Added a tool `get-test-steps` for getting a list of test steps for test case [#355](https://github.com/SmartBear/smartbear-mcp/pull/355)
- [Zephyr] Added a tool `get-test-cases` for fetching test cases linked to a Jira issue [#358](https://github.com/SmartBear/smartbear-mcp/pull/358)
- [Zephyr] Added a tool `create-web-link` for creating a Web link for a Test Cycle [#354](https://github.com/SmartBear/smartbear-mcp/pull/354)
- [Zephyr] Added a tool `create-test-execution-issue-link` for creating a link between a Jira issue and a Test Execution [#362](https://github.com/SmartBear/smartbear-mcp/pull/362)
- [Zephyr] Added a tool `get-test-steps` for getting a list of test steps for test execution [#367](https://github.com/SmartBear/smartbear-mcp/pull/367)
- [QMetry] Enhance LLM prompt handling with contextual metadata and usage tracking [#371](https://github.com/SmartBear/smartbear-mcp/pull/371)
- [Zephyr] Added a tool `get-links` for fetching links associated with given Test Cycle [#372](https://github.com/SmartBear/smartbear-mcp/pull/372)
- [Zephyr] Added a tool `get-links` for fetching links associated with given Test Case [#373](https://github.com/SmartBear/smartbear-mcp/pull/373)
- [Zephyr] Added a tool `get-test-cycles` for fetching Test Cycles linked to a Jira issue [#374](https://github.com/SmartBear/smartbear-mcp/pull/374)
- [Zephyr] Added a tool 'get-test-execution-links' for fetching links associated with given Test Execution [#376](https://github.com/SmartBear/smartbear-mcp/pull/376)
- [Zephyr] Added a tool 'get-test-executions' for fetching Test Executions associated with given Issue [#378](https://github.com/SmartBear/smartbear-mcp/pull/378)

### Changed

- [BugSnag] Remove eager caching during client configuration at startup - this is now lazy-loaded, but still cached as before for future requests [#356](https://github.com/SmartBear/smartbear-mcp/pull/356)
- [Reflect] Refactored implementation of existing tools. The `get-test-status` tool no longer requires a `testId`.
- [QMetry] Enhance LLM prompt handling with contextual metadata and usage tracking [#371](https://github.com/SmartBear/smartbear-mcp/pull/371)

## [0.14.1] - 2026-02-26

### Fixed

- [Zephyr] Fix issue with tools output schema validation

## [0.14.0] - 2026-02-25

### Added

- [Zephyr] Added a tool `create-test-case` for creating a Test Case [#320](https://github.com/SmartBear/smartbear-mcp/pull/320)
- [Zephyr] Added a tool `create-test-cycle` for creating a Test Cycle [#323](https://github.com/SmartBear/smartbear-mcp/pull/323)
- [Zephyr] Added a tool `update-test-case` for updating a Test Case [#325](https://github.com/SmartBear/smartbear-mcp/pull/325)
- [Zephyr] Added a tool `update-test-cycle` for updating a Test Cycle [#336](https://github.com/SmartBear/smartbear-mcp/pull/336)
- [Zephyr] Added a tool `create-test-execution` for creating a Test Execution [#335](https://github.com/SmartBear/smartbear-mcp/pull/335)
- [BugSnag] Updated the update errors tool to include functionality for snoozing BugSnag errors [#333](https://github.com/SmartBear/smartbear-mcp/pull/333)
- [Zephyr] Added a tool `create-web-link` for creating a Web link for a Test Case [#337](https://github.com/SmartBear/smartbear-mcp/pull/337)
- [BugSnag] Update the update errors tool to include functionality for linking and unlinking issues for BugSnag errors [#339](https://github.com/SmartBear/smartbear-mcp/pull/339)

## [0.13.5] - 2026-02-02

### Fixed

- [Swagger] Shorten tool name for API creation prompt [#317](https://github.com/SmartBear/smartbear-mcp/pull/317)
- [Common] Update images in docs [#316](https://github.com/SmartBear/smartbear-mcp/pull/316)

## [0.13.4] - 2026-01-28

### Added

- [Swagger] Added `source` property to Portal create TOC and update Document schemas [#314](https://github.com/SmartBear/smartbear-mcp/pull/314)

### Fixed

- [Swagger] Default URI to the UserManagementApi updated [#308](https://github.com/SmartBear/smartbear-mcp/pull/308)

## [0.13.3] - 2026-01-21

### Fixed

- [common] added pollyfills for sampling and elicitation to enable these mcp features to be used in ai apps like claude code [#306](https://github.com/SmartBear/smartbear-mcp/pull/306)

## [0.13.2] - 2026-01-13

### Fixed

- [common] update to latest mcp server.json from the previous deprecated schema

## [0.13.1] - 2026-01-13

### Fixed

- [common] npm publish issue in dockerfile

## [0.13.0] - 2026-01-09

### Added

- [Swagger] Added `SWAGGER_PORTAL_BASE_PATH`, `SWAGGER_REGISTRY_BASE_PATH` and `SWAGGER_UI_BASE_PATH` environment variables for configuring custom API endpoints, useful for on-premise Swagger Studio installations [#283](https://github.com/SmartBear/smartbear-mcp/pull/283)
- [PactFlow] Add metrics tools [#281](https://github.com/SmartBear/smartbear-mcp/pull/281)
- [Swagger] Extract version from X-Version header and update response structure [#287](https://github.com/SmartBear/smartbear-mcp/pull/287)
- [PactFlow] Disable AI tools for on-prem and OSS broker. [#295](https://github.com/SmartBear/smartbear-mcp/pull/295)

### Fixed

- [BugSnag] Remove misleading warning for event fields if no API is provided in configuration [#284](https://github.com/SmartBear/smartbear-mcp/pull/284)
- [Common] Allow all tools to be registered if stdio unconfigured. [#256](https://github.com/SmartBear/smartbear-mcp/pull/256)
- [BugSnag] Avoid a warning message for no projects found if no API key is configured. [#284](https://github.com/SmartBear/smartbear-mcp/pull/256)
- [BugSnag] Regenerate api client with original field name casing. [#292](https://github.com/SmartBear/smartbear-mcp/pull/292)

### Removed

- [Swagger] Remove `create_api_from_template` tool for as a non-useful for LLM [#288](https://github.com/SmartBear/smartbear-mcp/pull/288)

## [0.12.1] - 2025-12-09

### Changed

- [Swagger] Removed delete document functionality as this operation is not supported by the Portal API
- [Swagger] Removed delete portal functionality as this operation is not allowed via MCP

### Fixed

- [BugSnag] Fixed an issue with filter query formatting [#277](https://github.com/SmartBear/smartbear-mcp/pull/277)

## [0.12.0] - 2025-12-03

### Added

- [Zephyr] Added a tool for retrieving Environments [#243](https://github.com/SmartBear/smartbear-mcp/pull/243)
- [Zephyr] Added a tool for retrieving a list of Test Executions [#213](https://github.com/SmartBear/smartbear-mcp/pull/213)
- [Swagger] Added `create_api_from_prompt` tool for generating API definitions from natural language descriptions using SmartBear AI, with automatic governance and standardization [#257](https://github.com/SmartBear/smartbear-mcp/pull/257)
- [Swagger] Added `standardize_api` tool for scanning and automatically fixing API definitions to comply with governance and standardization rules using SmartBear AI [#257](https://github.com/SmartBear/smartbear-mcp/pull/257)
- [BugSnag] Added tools for querying performance data and managing network grouping rules: List/Get Span Groups, List Spans, Get Trace, List Trace Fields, Get/Set Network Endpoint Groupings [#253](https://github.com/SmartBear/smartbear-mcp/pull/253)
- Added --version command line argument to display the current version [#258](https://github.com/SmartBear/smartbear-mcp/pull/258)
- [QMetry] Add Automation Result Import Tools, Release/Cycle Creation, and few Bug Fixes [#264](https://github.com/SmartBear/smartbear-mcp/pull/264)
- [QMetry] Add Contextual Metadata to Tools for Better LLM Prompt Handling [#270](https://github.com/SmartBear/smartbear-mcp/pull/270)

### Changed

- [BugSnag] Removed event threads from Get Error response and introduced Get Event (by ID) [#263](https://github.com/SmartBear/smartbear-mcp/pull/263)

## [0.11.0] - 2025-11-20

### Added

- [Zephyr] Added a tool for retrieving Test Cycle [#210](https://github.com/SmartBear/smartbear-mcp/pull/210)
- [Zephyr] Added a tool for retrieving statuses [#212](https://github.com/SmartBear/smartbear-mcp/pull/212)
- [Zephyr] Added a tool for retrieving Test Cases [#230](https://github.com/SmartBear/smartbear-mcp/pull/230)
- [BugSnag] Add "Get Current Project" tool to retrieve details of the currently configured project and improve project detection if not configured at startup [#229](https://github.com/SmartBear/smartbear-mcp/pull/229)
- [Zephyr] Added a tool for retrieving Priorities [#227](https://github.com/SmartBear/smartbear-mcp/pull/227)
- [Zephyr] Added a tool for retrieving a Test Case [#215](https://github.com/SmartBear/smartbear-mcp/pull/215)
- [Zephyr] Added a tool for retrieving a Test Execution [#239](https://github.com/SmartBear/smartbear-mcp/pull/239)

### Changed

- [API Hub / Swagger] Rebranding from API Hub to Swagger [#233](https://github.com/SmartBear/smartbear-mcp/pull/233). **Note:** The environment variable `API_HUB_API_KEY` has been replaced with `SWAGGER_API_KEY`. The old variable name will still be supported for some time for backward compatibility.

## [0.10.0] - 2025-11-11

### Added

- [Common] Add HTTP transport support (StreamableHTTP & legacy SSE) [#196](https://github.com/SmartBear/smartbear-mcp/pull/196)
- [Common] Add centralized client registry system [#196](https://github.com/SmartBear/smartbear-mcp/pull/196)
- [Common] Add common cache service [#196](https://github.com/SmartBear/smartbear-mcp/pull/196)

### Changed

- [Common] Refactor client authentication [#196](https://github.com/SmartBear/smartbear-mcp/pull/196)
- [Qmetry] New QMetry MCP Server Tools Added, Refactored the existing tools structure [#217](https://github.com/SmartBear/smartbear-mcp/pull/217)
- [Collaborator] Initial Collaborator client implementation [#223](https://github.com/SmartBear/smartbear-mcp/pull/223)

## [0.9.0] - 2025-10-22

### Added

- [Qmetry] Added 4 New QMetry tools to enhance test management capabilities [#194](https://github.com/SmartBear/smartbear-mcp/pull/194)
- [Qmetry] Implement comprehensive test case tooling with enhanced error handling [#193](https://github.com/SmartBear/smartbear-mcp/pull/193)
- [API Hub] Add `scan_api_standardization` tool for validating API definitions against governance and standardization rules [#176](https://github.com/SmartBear/smartbear-mcp/pull/176)

## [0.8.0] - 2025-10-13

### Added

- [API Hub] Add `create_or_update_api` tool for creating or updating new API definitions in API Hub for Design [#257](https://github.com/SmartBear/smartbear-mcp/pull/257)
- [API Hub] Add `create_api_from_template` tool for creating new API definitions from templates in API Hub for Design [#257](https://github.com/SmartBear/smartbear-mcp/pull/257)
- [Zephyr] Add Zephyr capabilities to MCP [#171](https://github.com/SmartBear/smartbear-mcp/pull/171)

### Changed

- [BugSnag] Consolidate release and build tools [#173](https://github.com/SmartBear/smartbear-mcp/pull/173)

## [0.7.0] - 2025-10-02

### Added

- [Qmetry] Add QMetry Test Management capabilities to MCP [#152](https://github.com/SmartBear/smartbear-mcp/pull/152)
- [API Hub] Add `search_apis_and_domains` tool for discovering APIs and Domains in API Hub for Design [#154](https://github.com/SmartBear/smartbear-mcp/pull/154)
- [API Hub] Add `get_api_definition` tool for fetching resolved API definitions from API Hub for Design [#154](https://github.com/SmartBear/smartbear-mcp/pull/154)

## [0.6.0] - 2025-09-15

### Added

- [PactFlow] Add tool for matrix [#118](https://github.com/SmartBear/smartbear-mcp/pull/118)
- [PactFlow] Add tool for fetching AI entitlement [#129](https://github.com/SmartBear/smartbear-mcp/pull/129)
- [PactFlow] Add matcher recommendation in generate and review tool [#130](https://github.com/SmartBear/smartbear-mcp/pull/130)
- [BugSnag] Retrieve releases and builds, including stability scores [#139](https://github.com/SmartBear/smartbear-mcp/pull/109)

### Changed

- [BugSnag] Catch initialization errors to allow tools to remain discoverable [#139](https://github.com/SmartBear/smartbear-mcp/pull/139)

## [0.5.0] - 2025-09-08

### Added

- [BugSnag] Add pagination, sorting and total counts to list errors tool [#88](https://github.com/SmartBear/smartbear-mcp/pull/88)
- [PactFlow] Add remote OAD reading support to Generate and Review tool [#104](https://github.com/SmartBear/smartbear-mcp/pull/104)
- [PactFlow] Add tool for can-i-deploy PactFlow API [#106](https://github.com/SmartBear/smartbear-mcp/pull/106)

### Changed

- [BugSnag] BREAKING CHANGE: Rename Insight Hub tool to BugSnag, following rebranding. Configuration variables `INSIGHT_HUB_AUTH_TOKEN`, `INSIGHT_HUB_PROJECT_API_KEY` and `INSIGHT_HUB_ENDPOINT` need to be updated to `BUGSNAG_AUTH_TOKEN`, `BUGSNAG_PROJECT_API_KEY` and `BUGSNAG_ENDPOINT` after upgrade. [#101](https://github.com/SmartBear/smartbear-mcp/pull/101)
- [BugSnag] Remove API links from API responses [#110](https://github.com/SmartBear/smartbear-mcp/pull/110)

## [0.4.0] - 2025-08-26

### Added

- [Common] Add abstract server and registerTools / resources to simplify tool registration and standardise error monitoring across products [#70](https://github.com/SmartBear/smartbear-mcp/pull/70)
- [PactFlow] Add tool to generate Pact tests [#71](https://github.com/SmartBear/smartbear-mcp/pull/71)
- [PactFlow] Add tool to fetch provider states for PactFlow and Pact Broker [#87](https://github.com/SmartBear/smartbear-mcp/pull/87)
- [PactFlow] Add tool to review Pact tests [#89](https://github.com/SmartBear/smartbear-mcp/pull/89)

### Changed

- [Common] Derive tool name from title [#83](https://github.com/SmartBear/smartbear-mcp/pull/83)

## [0.3.0] - 2025-08-11

### Added

- Add vitest for unit testing [#41](https://github.com/SmartBear/smartbear-mcp/pull/41)
- [BugSnag] Add tool to update errors [#45](https://github.com/SmartBear/smartbear-mcp/pull/45)
- [BugSnag] Add latest event and URL to error details [#47](https://github.com/SmartBear/smartbear-mcp/pull/47)

### Changed

- [BugSnag] Improve data returned when getting error information [#61](https://github.com/SmartBear/smartbear-mcp/pull/61)

### Removed

- [BugSnag] Remove search field from filtering [#42](https://github.com/SmartBear/smartbear-mcp/pull/42)

## [0.2.2] - 2025-07-11

### Added

- [API Hub] Add user agent header to API requests [#34](https://github.com/SmartBear/smartbear-mcp/pull/34)
- [Reflect] Add user agent header to API requests [#34](https://github.com/SmartBear/smartbear-mcp/pull/34)

## [0.2.1] - 2025-07-09

### Changed

- Bumped `@modelcontextprotocol/sdk` to latest (v1.15.0) [#29](https://github.com/SmartBear/smartbear-mcp/pull/29)
- [BugSnag] Improved tool descriptions [#29](https://github.com/SmartBear/smartbear-mcp/pull/29)

### Added

- [BugSnag] Add API headers to support On-premise installations [#30](https://github.com/SmartBear/smartbear-mcp/pull/30)

## [0.2.0] - 2025-07-08

### Added

- [BugSnag] Add project API key configuration and initial caching [#27](https://github.com/SmartBear/smartbear-mcp/pull/27)
- [BugSnag] Add error filtering by both standard fields and custom filters [#27](https://github.com/SmartBear/smartbear-mcp/pull/27)
- [BugSnag] Add endpoint configuration for non-bugsnag.com endpoints and improve handling for unsuccessful status codes [#26](https://github.com/SmartBear/smartbear-mcp/pull/26)

## [0.1.1] - 2025-07-01

### Changed

- Updated README to reflect the correct package name and usage instructions
- Added more fields to package.json for better npm integration

## [0.1.0] - 2025-06-30

### Added

- Initial release of SmartBear MCP server npm package
- Provides programmatic access to SmartBear BugSnag, Reflect, and API Hub
- Includes runtime field filtering for API responses based on TypeScript types
- Documentation and usage instructions for npm and local development
