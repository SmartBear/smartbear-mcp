![api-hub.png](./images/embedded/api-hub.png)

The API Hub client provides portal management capabilities as listed below. Tools for API Hub require an `API_HUB_API_KEY`.

## Available Tools

### `list_portals`

-   Purpose: Search for available portals within API Hub. Only portals where you have at least a designer role, either at the product level or organization level, are returned.
-   Returns: Paged list of portals with metadata including name, subdomain, status, and more.
-   Use case: Discovery of available portals.

### `get_portal`

-   Purpose: Retrieve information about a specific portal.
-   Parameters: Portal UUID or subdomain (`portalId`).
-   Returns: Complete set of metadata properties for a specific portal.
-   Use case: Get full details on a specific portal configuration.

### `create_portal`

-   Purpose: Create a new portal with API Hub.
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
| `swaggerHubOrganizationId` | The corresponding API Hub (formerly SwaggerHub) organization UUID | string (uuid) | Yes |
| `openapiRenderer` | Portal level setting for the OpenAPI renderer.<br />-   `SWAGGER_UI` - Use the Swagger UI renderer<br />-   `ELEMENTS` - Use the Elements renderer<br />-   `TOGGLE` - Switch between the two renderers with elements set as the default<br />Default: `TOGGLE` | string | No |
| `pageContentFormat` | Determines the format of the page content (`HTML` or `MARKDOWN` or `BOTH`)<br />Default: `HTML` | string | No |

### `delete_portal`

-   Purpose: Delete a portal.
-   Parameters: Portal UUID or subdomain (`portalId`).
-   Returns: No content on success.
-   Use case: Delete an existing portal from API Hub.

### `update_portal`

-   Purpose: Update a specific portal's configuration.
-   Returns: Complete set of metadata properties for a specific portal.
-   Use case: Update configuration settings of existing API Hub portal.
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
| `swaggerHubOrganizationId` | The corresponding API Hub (formerly SwaggerHub) organization UUID | string (uuid) | Yes |
| `openapiRenderer` | Portal level setting for the OpenAPI renderer.<br />-   `SWAGGER_UI` - Use the Swagger UI renderer<br />-   `ELEMENTS` - Use the Elements renderer<br />-   `TOGGLE` - Switch between the two renderers with elements set as the default<br />Default: `TOGGLE` | string | No |
| `pageContentFormat` | Determines the format of the page content (`HTML` or `MARKDOWN` or `BOTH`)<br />Default: `HTML` | string | No |

### `list_portal_products`

-   Purpose: Get products for a specific portal.
-   Parameters: Portal UUID or subdomain (`portalId`).
-   Returns: Paged list of products for a portal.
-   Use case: Understanding the products that exist for a given portal.

### `get_portal_product`

-   Purpose: Retrieve information about a specific product resource.
-   Parameters: Product UUID (`productId`).
-   Returns: Complete set of properties for a specific product.
-   Use case: Understanding the product information and status (both from a publishing and visibility perspective).

### `create_portal_product`

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

### `update_portal_product`

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

### `delete_portal_product`

-   Purpose: Delete a product from a specific portal.
-   Parameters: Product UUID (`productId`).
-   Returns: No content on success.
-   Use case: Delete an existing product from an API Hub portal.
