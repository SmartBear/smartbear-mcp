---
name: generate-api-tests
description: Generate executable API tests from an OpenAPI definition, covering happy paths, documented error responses, and response schema validation
---

Generate API tests from an OpenAPI definition using the project's own test framework.

## Steps

1. Get the API definition:
   - If the user pointed at a local OpenAPI file (YAML/JSON), read it.
   - If the user named an API in SwaggerHub, find it with `swagger_search_apis_and_domains` and fetch it with `swagger_get_api_definition`.
   - If neither was given, look for OpenAPI definitions in the workspace (`openapi.yaml`, `openapi.json`, `swagger.yaml`, files under `api/` or `specs/`) and ask the user to pick if several are found.
2. Detect the project's test setup: framework (from dependency manifests and existing test files), HTTP client conventions, fixture patterns, and where API/integration tests live. Follow those conventions exactly. If the project has no test setup, propose a minimal one idiomatic for the project's language before writing tests.
3. Plan coverage from the definition and present it briefly before writing code. For each operation:
   - Happy path per documented 2xx response, using realistic values derived from schemas and examples.
   - Every documented 4xx/5xx response (invalid payloads, missing auth, not-found IDs).
   - Response schema validation: assert required fields, types, and enums against the definition's schemas.
   - Boundary cases where schemas define them (min/max, length limits, required vs optional).
4. Write the tests, grouped per resource/tag as the project's structure dictates. Make the API base URL configurable (environment variable or existing project config), and mark tests that need real credentials or seeded data clearly (skip annotation or documented prerequisites) instead of inventing fake assumptions.
5. Run the new tests if a target environment is configured; otherwise run them in whatever mode the project supports (e.g. against a mock/local server) and report what still needs a live environment.
6. Summarize: files created, operations covered, and any spec gaps found while generating (undocumented error responses, missing examples, ambiguous schemas) — these are worth fixing in the definition itself (see `/validate-api-contract`).

Every test must trace back to the definition — do not invent undocumented behavior; flag it instead.
