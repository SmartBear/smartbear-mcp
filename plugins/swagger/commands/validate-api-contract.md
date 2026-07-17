---
name: validate-api-contract
description: Validate an OpenAPI definition against your organization's Swagger governance and standardization rules, then report violations with concrete fixes
---

Validate an API contract against the organization's standardization rules using the Swagger MCP tools.

## Steps

1. Identify the API definition to validate:
   - If the user pointed at a local file (OpenAPI YAML/JSON in this workspace), read it.
   - If the user named an API in SwaggerHub, find it with `swagger_search_apis_and_domains` and confirm the match if more than one candidate exists.
   - If neither was given, look for OpenAPI definitions in the workspace (`openapi.yaml`, `openapi.json`, `swagger.yaml`, files under `api/` or `specs/`) and ask the user to pick if several are found.
2. Run the governance scan:
   - Local file: pass its raw contents to `swagger_scan_api_standardization`.
   - Registry API: use `swagger_scan_api_standardization_from_registry`.
3. Report the results as a table: rule violated, severity, location (path/line or JSON pointer), and a one-line suggested fix. Group by severity, most severe first.
4. If there are violations and the definition is a local file, offer to fix them:
   - Apply straightforward fixes (missing descriptions, naming conventions, missing examples) directly by editing the file.
   - For fixes that change API semantics (renamed paths, changed schemas), list them and let the user decide.
   - Alternatively, `swagger_standardize_api` can auto-fix the definition; show the diff between the original and the standardized version before saving.
5. Re-run the scan on the updated definition and confirm the result is clean (or list what intentionally remains).

If no standardization rules are configured for the organization, say so and fall back to a general OpenAPI best-practices review (missing operation descriptions, undocumented error responses, missing examples, inconsistent naming).
