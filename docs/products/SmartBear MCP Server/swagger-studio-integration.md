![swagger-studio.png](./images/embedded/swagger-studio.png)

The Swagger Studio client provides comprehensive API and Domain management capabilities through SwaggerHub Registry. Access to these features requires authentication with a `SWAGGER_API_KEY`.

## Available Tools

### Swagger Studio API Tools

#### `search_apis_and_domains`

-   Purpose: Search for APIs and Domains in Swagger Studio using the comprehensive /specs endpoint and retrieve metadata including owner, name, description, summary, version, and specification.
-   Returns: List of API and Domain specifications matching the search criteria.
-   Use case: Discover existing APIs and domains for integration or reference.
-   Parameters:

| Parameter | Description | Type | Required |
| --- | --- | --- | --- |
| `query` | Free text search - searches name and description | string | No |
| `owner` | API/Domain owner (username or organization name) | string | No |
| `sort` | Field used to sort the list.<br />Options: `NAME`, `UPDATED`, `CREATED`, `OWNER`<br />Default: `NAME` | string | No |
| `order` | Sort order.<br />Options: `ASC`, `DESC`<br />Default: `ASC` | string | No |
| `page` | Page to return<br />Default: `0` | number | No |
| `limit` | Number of results per page<br />Default: `10`, Max: `100` | number | No |
| `specType` | Type of spec to search for.<br />Options: `API`, `DOMAIN`, `ANY`<br />Default: `ANY` | string | No |
| `visibility` | Visibility of the spec.<br />Options: `PUBLIC`, `PRIVATE`, `ANY`<br />Default: `ANY` | string | No |
| `state` | State of the spec.<br />Options: `PUBLISHED`, `UNPUBLISHED`, `ANY`<br />Default: `ANY` | string | No |

#### `get_api_definition`

-   Purpose: Fetch a resolved API definition from Swagger Studio based on its owner, API name, and version.
-   Returns: Complete OpenAPI specification for the requested API.
-   Use case: Retrieve the specified API definitions for integration, testing, or documentation purposes.
-   Parameters:

| Parameter | Description | Type | Required |
| --- | --- | --- | --- |
| `owner` | API owner (username or organization name) | string | Yes |
| `api` | API name | string | Yes |
| `version` | API version | string | Yes |

#### `create_or_update_api`

-   Purpose: Create a new API or update an existing API in SwaggerHub Registry for Swagger Studio. The API specification type (OpenAPI, AsyncAPI) is automatically detected from the definition content. If an API with the same owner and name already exists, it will be updated; otherwise, a new API will be created.
-   Returns: API metadata including owner, name, version (always 1.0.0), SwaggerHub URL, and operation type ('create' or 'update'). HTTP 201 indicates creation, HTTP 200 indicates update.
-   Use case: Programmatically create new APIs from OpenAPI/AsyncAPI specifications, update existing API definitions with new versions of the specification, or migrate APIs into Swagger Studio.
-   Parameters:

| Parameter | Description | Type | Required |
| --- | --- | --- | --- |
| `owner` | Organization name (owner of the API) | string | Yes |
| `apiName` | API name. If an API with this name already exists under the specified owner, it will be updated. | string | Yes |
| `definition` | API definition content (OpenAPI/AsyncAPI specification in JSON or YAML format). Format is automatically detected. API is created with fixed values: version 1.0.0, private visibility, automock disabled, and no project assignment. | string | Yes |

#### `create_api_from_template`

-   Purpose: Create a new API in SwaggerHub Registry using a predefined template. This endpoint creates APIs based on existing templates without requiring manual definition content.
-   Returns: API metadata including owner, name, template used, SwaggerHub URL, and operation type ('create' or 'update'). HTTP 201 indicates creation, HTTP 200 indicates update.
-   Use case: Quickly bootstrap new APIs from organization templates, ensure consistency across API projects, or start new API development with pre-configured standards.
-   Parameters:

| Parameter | Description | Type | Required |
| --- | --- | --- | --- |
| `owner` | Organization name (owner of the API) | string | Yes |
| `apiName` | API name | string | Yes |
| `template` | Template name to use for creating the API. Format: owner/template-name/version (e.g., 'swagger-hub/petstore-template/1.0.0'). API is created with fixed values: private visibility, no project assignment, and reconciliation enabled.<br />**Note**: Available templates can be found in your organization's SwaggerHub template library or by checking the SwaggerHub public templates (e.g. via search_apis_and_domains). | string | Yes |

#### `scan_api_standardization`

-   Purpose: Run a standardization scan against an API definition using the organization's standardization configuration. Validates OpenAPI/AsyncAPI definitions against configured governance rules and style guides.
-   Returns: Standardization result with a list of validation errors and warnings. Each error includes severity level, rule name, and location information.
-   Use case: Validate API definitions against organization standards before publishing, ensure compliance with API governance policies, and identify design inconsistencies early in the development process.
-   Parameters:

| Parameter | Description | Type | Required |
| --- | --- | --- | --- |
| `orgName` | Organization name to use for standardization rules | string | Yes |
| `definition` | API definition content (OpenAPI/AsyncAPI specification in JSON or YAML format). Format is automatically detected. | string | Yes |

## Configuration

To use Swagger Studio tools, you need to configure the `SWAGGER_API_KEY` environment variable with your Swagger API token.

## Common Use Cases

1. **API Discovery**: Use `search_apis_and_domains` to find existing APIs in your Swagger Studio.
2. **API Integration**: Retrieve specific API definitions with `get_api_definition` for development or testing purposes.
3. **API Creation**: Create new APIs using `create_or_update_api` with custom definitions or `create_api_from_template` using organization templates.
4. **API Governance**: Validate API definitions against organization standards using `scan_api_standardization` to ensure compliance with governance policies.
