![api-hub.png](./images/embedded/api-hub.png)

The Swagger client provides comprehensive Swagger Portal and Swagger Studio management capabilities. Access to these features requires authentication with a `SWAGGER_API_KEY`.

## Available Tools

### Portal Management Tools

#### `list_portals`

-   Purpose: Search for available portals within Swagger. Returns only the portals for which you are an owner or designer, either at the product or organization level.
-   Returns: Paginated list of portals, including metadata such as name, subdomain, status, and more.
-   Use case: Discovery of available portals.

#### `get_portal`

-   Purpose: Retrieve information about a specific portal.
-   Parameters: Portal UUID or subdomain (`portalId`).
-   Returns: Complete set of metadata properties for a specific portal.
-   Use case: Get full details on a specific portal configuration.

#### `create_portal`

-   Purpose: Create a new portal with Swagger.
-   Returns: Complete set of metadata properties for a specific portal.
-   Use case: Get full details on a specific portal configuration.
-   Parameters:

| Parameter | Description | Type | Required |
| --- | --- | --- | --- |
| `name` | The portal name.<br />Must be between 3 and 40 characters. | string | No |
| `subdomain` | The subdomain to use for the portal.<br />Must be between 3 and 20 characters. | string | Yes |
| `offline` | If set to true the portal will not be visible to customers.<br />Default: `false` | boolean | No |
| `routing` | Determines the routing strategy ('`browser`' or '`proxy`').<br />Default: `browser` | string | No |
| `credentialsEnabled` | Indicates if credentials are enabled for the portal.<br />Default: `true` | boolean | No |
| `swaggerHubOrganizationId` | The corresponding Swagger (formerly SwaggerHub) organization UUID | string (uuid) | Yes |
| `openapiRenderer` | Portal level setting for the OpenAPI renderer.<br />-   `SWAGGER_UI` - Use the Swagger UI renderer<br />-   `ELEMENTS` - Use the Elements renderer<br />-   `TOGGLE` - Switch between the two renderers with elements set as the default<br />Default: `TOGGLE` | string | No |
| `pageContentFormat` | Determines the format of the page content (`HTML` or `MARKDOWN` or `BOTH`)<br />Default: `HTML` | string | No |

#### `delete_portal`

-   Purpose: Delete a portal.
-   Parameters: Portal UUID or subdomain (`portalId`).
-   Returns: No content on success.
-   Use case: Delete an existing portal from Swagger.

#### `update_portal`

-   Purpose: Update a specific portal's configuration.
-   Returns: Complete set of metadata properties for a specific portal.
-   Use case: Update configuration settings of existing Swagger portal.
-   Parameters:

| Parameter | Description | Type | Required |
| --- | --- | --- | --- |
| `name` | The portal name.<br />Must be between 3 and 40 characters. | string | No |
| `subdomain` | Subdomain for this portal. Must be unique.<br />Must be between 3 and 20 characters. | string | No |
| `customDomain` | Custom domain for this portal. Must be unique.<br />If the value is explicitly set to null, the custom domain will be removed. | string | No |
| `offline` | If set to true the portal will not be visible to customers.<br />Default: `false` | boolean | No |
| `gtmKey` | The Google Tag Manager key for this portal. | string | No |
| `routing` | Determines the routing strategy ('`browser`' or '`proxy`').<br />Default: `browser` | string | No |
| `credentialsEnabled` | Indicates if credentials are enabled for the portal.<br />Default: `true` | boolean | No |
| `swaggerHubOrganizationId` | The corresponding Swagger Studio (formerly SwaggerHub) organization UUID | string (uuid) | Yes |
| `openapiRenderer` | Portal level setting for the OpenAPI renderer.<br />-   `SWAGGER_UI` - Use the Swagger UI renderer<br />-   `ELEMENTS` - Use the Elements renderer<br />-   `TOGGLE` - Switch between the two renderers with elements set as the default<br />Default: `TOGGLE` | string | No |
| `pageContentFormat` | Determines the format of the page content (`HTML` or `MARKDOWN` or `BOTH`)<br />Default: `HTML` | string | No |

#### `list_portal_products`

-   Purpose: Get products for a specific portal.
-   Parameters: Portal UUID or subdomain (`portalId`).
-   Returns: Paginated list of products in a portal.
-   Use case: Understanding the products that exist for a given portal.

#### `get_portal_product`

-   Purpose: Retrieve information about a specific product resource.
-   Parameters: Product UUID (`productId`).
-   Returns: Complete set of properties for a specific product.
-   Use case: Understanding the product information and status (both from a publishing and visibility perspective).

#### `create_portal_product`

-   Purpose: Create a new product within a specific portal.
-   Returns: Information about the newly created product.
-   Use case: Add a new product to a portal.
-   Parameters: 

| Parameter          |               | Description | Type | Required |
| ------------------ | ------------- | ----------- | ---- | -------- |
| `portalId`         |               | Portal UUID or subdomain. | string | Yes |
| `createPortalArgs` | `type`        | The mode of creation. `new` or `copy` | string | Yes |
|                    | `name`        | The product name.<br />Must be between 3 and 40 characters. | string | Yes |
|                    | `slug`        | URL component for this product. Must be unique within the portal.<br />Must be between 3 and 22 characters. | string | Yes |
|                    | `description` | The product description.<br />Max length is 110 characters. | string | No |
|                    | `public`      | Whether this product is available to non-members of the organization. | boolean | No |
|                    | `hidden`      | If set to true, this product will not be displayed on the landing page. | boolean | No |

#### `update_portal_product`

-   Purpose: Update an product within a specific portal.
-   Returns: Information about the update product.
-   Use case: Change information on an existing product.
-   Parameters: 

| Parameter          |               | Description | Type | Required |
| ------------------ | ------------- | ----------- | ---- | -------- |
| `productId`        |               | Identifier of product to update. | string | Yes |
| `updatePortalArgs` | `name`        | The product name.<br />Must be between 3 and 40 characters. | string | Yes |
|                    | `slug`        | URL component for this product. Must be unique within the portal.<br />Must be between 3 and 22 characters. | string | Yes |
|                    | `description` | The product description.<br />Max length is 110 characters. | string | No |
|                    | `version`     | The product version. | string | No |
|                    | `public`      | Whether this product is available to non-members of the organization. | boolean | No |
|                    | `hidden`      | If set to true, this product will not be displayed on the landing page. | boolean | No |

#### `delete_portal_product`

-   Purpose: Delete a product from a specific portal.
-   Parameters: Product UUID (`productId`).
-   Returns: No content on success.
-   Use case: Delete an existing product from a Swagger portal.

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

To use Swagger tools, you need to configure the `SWAGGER_API_KEY` environment variable with your Swagger API token.

## Common Use Cases

1. **Portal Discovery**: Use `list_portals` to find available portals you have access to.
2. **Portal Management**: Create, update, and delete portals using the respective tools.
3. **Product Organization**: Manage products within portals for better API organization.
4. **API Discovery**: Use `search_apis_and_domains` to find existing APIs in your Swagger Studio.
5. **API Integration**: Retrieve specific API definitions with `get_api_definition` for development or testing purposes.
6. **API Creation**: Create new APIs using `create_or_update_api` with custom definitions or `create_api_from_template` using organization templates.
7. **API Governance**: Validate API definitions against organization standards using `scan_api_standardization` to ensure compliance with governance policies.
