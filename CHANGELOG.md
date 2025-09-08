# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.5.0] - 2025-09-08

### Added

- [BugSnag] Add pagination, sorting and total counts to list errors tool [#88](https://github.com/SmartBear/smartbear-mcp/pull/88)
- [PactFlow] Add remote OAD reading support to Generate and Review tool [#104](https://github.com/SmartBear/smartbear-mcp/pull/104)
- [PactFlow] Add tool for can-i-deploy PactFlow API [#106](https://github.com/SmartBear/smartbear-mcp/pull/106)

### Changed

- [BugSnag] BREAKING CHANGE: Rename Insight Hub tool to BugSnag, following rebranding. Configuration variables `INSIGHT_HUB_AUTH_TOKEN` and `INSIGHT_HUB_PROJECT_API_KEY` need to be updated to `BUGSNAG_AUTH_TOKEN` and `BUGSNAG_PROJECT_API_KEY` after upgrade. [#101](https://github.com/SmartBear/smartbear-mcp/pull/101)
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
