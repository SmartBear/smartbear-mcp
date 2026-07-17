---
name: check-api-drift
description: Compare the API definition published in SwaggerHub with the actual implementation in this codebase and report drift
---

Detect drift between the published API contract in SwaggerHub and the implementation in this workspace.

## Steps

1. Get the published definition: find the API with `swagger_search_apis_and_domains` (match against this repository's name or ask the user) and fetch the default/published version with `swagger_get_api_definition`. If the contract lives in a local OpenAPI file instead, use that as the source of truth.
2. Map the implementation: locate route/endpoint definitions in the codebase (framework routers, controllers, handler decorators), plus request/response models (DTOs, serializers, validation schemas). Read the relevant files rather than relying on naming alone.
3. Compare contract vs implementation and classify every mismatch:
   - **Missing**: operations in the definition with no implementation.
   - **Undocumented**: implemented endpoints absent from the definition.
   - **Changed**: same operation, different shape — parameters (name, type, required), request/response schemas, status codes, auth requirements.
4. Report as a table: operation (method + path), drift type, definition says vs code says (with `file:line` references), severity. Breaking changes for consumers (removed fields, narrowed types, new required parameters) first.
5. Offer to reconcile — the user decides the direction:
   - **Code is the source of truth**: update the definition and push it with `swagger_create_or_update_api` (run `swagger_scan_api_standardization` on the updated definition first).
   - **Contract is the source of truth**: list the code changes needed per endpoint; implement them if asked.
6. If there is no drift, say so explicitly, listing what was compared (number of operations, schemas) so the result is verifiable.

Never silently pick a reconciliation direction — surfacing the drift is the deliverable; changing contract or code is a separate, explicit decision.
