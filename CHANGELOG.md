# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
- [API Hub] Add `scan_api_standardization` tool for validating API definitions against organization standardization rules [#176](https://github.com/SmartBear/smartbear-mcp/pull/176)

## [0.8.0] - 2025-10-13

### Added
- [API Hub] Add `create_or_update_api` tool for creating or updating new API definitions in API Hub for Design
- [API Hub] Add `create_api_from_template` tool for creating new API definitions from templates in API Hub for Design
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
