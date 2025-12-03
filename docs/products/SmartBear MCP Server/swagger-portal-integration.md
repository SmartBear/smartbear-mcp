![swagger-portal.png](./images/embedded/swagger-portal.png)

The Swagger Portal client provides comprehensive portal and product management capabilities. Access to these features requires authentication with a `SWAGGER_API_KEY`.

## Available Tools

### Portal Management Tools

#### `list_portals`

- Purpose: Search for available portals within Swagger. Returns only the portals for which you are an owner or designer, either at the product or organization level.
- Returns: Paginated list of portals, including metadata such as name, subdomain, status, and more.
- Use case: Discovery of available portals.

#### `get_portal`

- Purpose: Retrieve information about a specific portal.
- Parameters: Portal UUID or subdomain (`portalId`).
- Returns: Complete set of metadata properties for a specific portal.
- Use case: Get full details on a specific portal configuration.

#### `create_portal`

- Purpose: Create a new portal with Swagger.
- Returns: Complete set of metadata properties for a specific portal.
- Use case: Get full details on a specific portal configuration.
- Parameters:

| Parameter                  | Description                                                                                                                                                                                                                                               | Type          | Required |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | -------- |
| `name`                     | The portal name.<br />Must be between 3 and 40 characters.                                                                                                                                                                                                | string        | No       |
| `subdomain`                | The subdomain to use for the portal.<br />Must be between 3 and 20 characters.                                                                                                                                                                            | string        | Yes      |
| `offline`                  | If set to true the portal will not be visible to customers.<br />Default: `false`                                                                                                                                                                         | boolean       | No       |
| `routing`                  | Determines the routing strategy ('`browser`' or '`proxy`').<br />Default: `browser`                                                                                                                                                                       | string        | No       |
| `credentialsEnabled`       | Indicates if credentials are enabled for the portal.<br />Default: `true`                                                                                                                                                                                 | boolean       | No       |
| `swaggerHubOrganizationId` | The corresponding Swagger (formerly SwaggerHub) organization UUID                                                                                                                                                                                         | string (uuid) | Yes      |
| `openapiRenderer`          | Portal level setting for the OpenAPI renderer.<br />- `SWAGGER_UI` - Use the Swagger UI renderer<br />- `ELEMENTS` - Use the Elements renderer<br />- `TOGGLE` - Switch between the two renderers with elements set as the default<br />Default: `TOGGLE` | string        | No       |
| `pageContentFormat`        | Determines the format of the page content (`HTML` or `MARKDOWN` or `BOTH`)<br />Default: `HTML`                                                                                                                                                           | string        | No       |

#### `update_portal`

- Purpose: Update a specific portal's configuration.
- Returns: Complete set of metadata properties for a specific portal.
- Use case: Update configuration settings of existing Swagger portal.
- Parameters:

| Parameter            | Description                                                                                                                                         | Type    | Required |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | -------- |
| `portalId`           | Portal UUID or subdomain - unique identifier for the portal instance                                                                                | string  | Yes      |
| `name`               | Update the portal display name - shown to users and in branding (3-40 characters)                                                                   | string  | No       |
| `subdomain`          | Update the portal subdomain - changes the portal URL. Must remain unique across all portals (3-20 characters, lowercase, alphanumeric with hyphens) | string  | No       |
| `customDomain`       | Set a custom domain for the portal by providing the domain name as a string. To remove the custom domain, set this value to `null`.                 | string  | No       |
| `offline`            | Set portal visibility - true hides portal from customers (useful for maintenance or development)                                                    | boolean | No       |
| `gtmKey`             | Google Tag Manager key for analytics tracking - format: GTM-XXXXXX (max 25 characters)                                                              | string  | No       |
| `routing`            | Update routing strategy - 'browser' for client-side routing or 'proxy' for server-side routing                                                      | string  | No       |
| `credentialsEnabled` | Enable/disable authentication credentials for portal access - controls whether users can authenticate to view private content                       | boolean | No       |
| `openapiRenderer`    | Change OpenAPI renderer: 'SWAGGER_UI' (Swagger UI), 'ELEMENTS' (Stoplight Elements), or 'TOGGLE' (switch between both)                              | string  | No       |
| `pageContentFormat`  | Update page content format for documentation rendering: 'HTML', 'MARKDOWN', or 'BOTH'                                                               | string  | No       |

#### `list_portal_products`

- Purpose: Get products for a specific portal.
- Parameters: Portal UUID or subdomain (`portalId`).
- Returns: Paginated list of products in a portal.
- Use case: Understanding the products that exist for a given portal.

#### `get_portal_product`

- Purpose: Retrieve information about a specific product resource.
- Parameters: Product UUID (`productId`).
- Returns: Complete set of properties for a specific product.
- Use case: Understanding the product information and status (both from a publishing and visibility perspective).

#### `create_portal_product`

- Purpose: Create a new product within a specific portal.
- Returns: Information about the newly created product.
- Use case: Add a new product to a portal.
- Parameters:

| Parameter         | Description                                                                                                                                                                                            | Type    | Required |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------- | -------- |
| `portalId`        | Portal UUID or subdomain.                                                                                                                                                                              | string  | Yes      |
| `type`            | Product creation type - 'new' to create from scratch or 'copy' to duplicate an existing product                                                                                                        | string  | Yes      |
| `sourceProductId` | Source product UUID to copy from when type is 'copy'. Specifies which existing product to duplicate. Omit when type is 'new'.                                                                          | string  | No       |
| `name`            | Product display name - will be shown to users in the portal navigation and product listings (3-40 characters)                                                                                          | string  | Yes      |
| `slug`            | URL-friendly identifier for the product - must be unique within the portal, used in URLs (e.g., 'my-api' becomes /my-api). 3-22 characters, lowercase, alphanumeric with hyphens, underscores, or dots | string  | Yes      |
| `description`     | Product description - explains what the API/product does, shown in product listings and cards (max 110 characters)                                                                                     | string  | No       |
| `public`          | Whether the product is publicly visible to all portal visitors - false means only authenticated users with appropriate roles can access it                                                             | boolean | No       |
| `hidden`          | Whether the product is hidden from the portal landing page navigation menus - useful for internal or draft products                                                                                    | boolean | No       |
| `role`            | Whether the product has role-based access restrictions - controls if specific user roles are required to access the product                                                                            | boolean | No       |

#### `update_portal_product`

- Purpose: Update an product within a specific portal.
- Returns: Information about the update product.
- Use case: Change information on an existing product.
- Parameters:

| Parameter     | Description                                                                                                                                                          | Type    | Required |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | -------- |
| `productId`   | Product UUID or identifier in the format 'portal-subdomain:product-slug' - unique identifier for the product                                                         | string  | Yes      |
| `name`        | Update product display name - changes how it appears to users in navigation and listings (3-40 characters)                                                           | string  | No       |
| `slug`        | Update URL-friendly identifier - must remain unique within the portal, affects product URLs (3-22 characters, lowercase, alphanumeric with hyphens/underscores/dots) | string  | No       |
| `description` | Update product description - explains the API/product functionality, shown in listings (max 110 characters)                                                          | string  | No       |
| `public`      | Change product visibility - true makes it publicly accessible to all visitors, false restricts to authenticated users with roles                                     | boolean | No       |
| `hidden`      | Change navigation visibility - true hides from portal landing page menus while keeping the product accessible via direct links                                       | boolean | No       |

#### `delete_portal_product`

- Purpose: Delete a product from a specific portal.
- Parameters: Product UUID (`productId`).
- Returns: No content on success.
- Use case: Delete an existing product from a Swagger portal.

#### `publish_portal_product`

- Purpose: Publish a product's content to make it live or as preview. This endpoint publishes the current content of a product, making it visible to portal visitors. Use preview mode to test before going live.
- Returns: Publication status information.
- Use case: Make product content visible to portal visitors, either as live content or preview for testing.
- Parameters:

| Parameter   | Description                                                                                                                          | Type    | Required |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------- | -------- |
| `productId` | Product UUID or identifier in the format 'portal-subdomain:product-slug' - unique identifier for the product                         | string  | Yes      |
| `preview`   | Whether to publish as preview (true) or live (false). Preview allows testing before going live. Defaults to false (live publication) | boolean | No       |

### Product Sections Management

#### `list_portal_product_sections`

- Purpose: Get sections for a specific product within a portal.
- Returns: List of sections within a product, including metadata and embedded table of contents if requested.
- Use case: Understanding the structure and organization of content within a product.
- Parameters:

| Parameter   | Description                                                                                                                                                            | Type   | Required |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | -------- |
| `productId` | Product UUID or identifier in the format 'portal-subdomain:product-slug' - unique identifier for the product                                                           | string | Yes      |
| `embed`     | List of related entities to embed in the response - e.g., ['tableOfContents', 'tableOfContents.swaggerhubApi'] to include table of contents and SwaggerHub API details | array  | No       |
| `page`      | Page number for paginated results - specifies which page of results to retrieve (default is 1)                                                                         | number | No       |
| `size`      | Number of items per page for pagination - controls how many results are returned per page (default is 20)                                                              | number | No       |

### Table of Contents Management

#### `create_table_of_contents`

- Purpose: Create a new table of contents item in a portal product section. Supports API references, HTML content, and Markdown content types.
- Returns: Information about the newly created table of contents item.
- Use case: Add structured content navigation to product sections.
- Parameters:

| Parameter   | Description                                                                                                                                                         | Type        | Required |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | -------- |
| `sectionId` | Section ID - unique identifier for the section within the product                                                                                                   | string      | Yes      |
| `type`      | Type of table of contents creation - 'new' to create from scratch or 'copy' to duplicate an existing one                                                            | string      | Yes      |
| `title`     | Title of the table of contents item - will be displayed in navigation (3-40 characters)                                                                             | string      | Yes      |
| `slug`      | URL-friendly identifier for the table of contents item - must be unique within the section (3-22 characters, lowercase, alphanumeric with hyphens/underscores/dots) | string      | Yes      |
| `order`     | Order position of the table of contents item within its parent section or item                                                                                      | number      | Yes      |
| `parentId`  | Parent table of contents item ID - null for top-level items, or ID of parent item for nested structure                                                              | string/null | No       |
| `content`   | Content configuration for the table of contents item                                                                                                                | object      | Yes      |

#### `list_table_of_contents`

- Purpose: Get table of contents for a section of a product within a portal.
- Returns: List of table of contents items within a section, including nested structure and content metadata.
- Use case: Understanding the navigation structure and content organization within a product section.
- Parameters:

| Parameter   | Description                                                                                                   | Type   | Required |
| ----------- | ------------------------------------------------------------------------------------------------------------- | ------ | -------- |
| `sectionId` | Section ID - unique identifier for the section within the product                                             | string | Yes      |
| `embed`     | List of related entities to embed in the response - e.g., ['swaggerhubApi'] to include SwaggerHub API details | array  | No       |
| `page`      | Page number for paginated results - specifies which page of results to retrieve (default is 1)                | number | No       |
| `size`      | Number of items per page for pagination - controls how many results are returned per page (default is 20)     | number | No       |

#### `delete_table_of_contents`

- Purpose: Delete table of contents entry. Performs a soft-delete of an entry from the table of contents. Supports recursive deletion of nested items.
- Returns: No content on success.
- Use case: Remove table of contents items and optionally their nested structure.
- Parameters:

| Parameter           | Description                                                                                                                 | Type    | Required |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------- | ------- | -------- |
| `tableOfContentsId` | The table of contents UUID, or identifier in the format 'portal-subdomain:product-slug:section-slug:table-of-contents-slug' | string  | Yes      |
| `recursive`         | Flag to include all the nested tables of contents (default: false)                                                          | boolean | No       |

### Document Management

**Note**: Documents are managed as part of table of contents items. To delete a document, use `delete_table_of_contents` which will remove the table of contents entry and any associated document content.

#### `get_document`

- Purpose: Get document content and metadata by document ID. Useful for retrieving HTML or Markdown content from table of contents items.
- Returns: Document content and metadata including type, creation/modification dates.
- Use case: Retrieve content for editing or display purposes.
- Parameters:

| Parameter    | Description                                        | Type   | Required |
| ------------ | -------------------------------------------------- | ------ | -------- |
| `documentId` | Document UUID - unique identifier for the document | string | Yes      |

#### `update_document`

- Purpose: Update the content of an existing document. Supports both HTML and Markdown content types.
- Returns: Updated document metadata.
- Use case: Modify existing documentation content within portal products.
- Parameters:

| Parameter    | Description                                                               | Type   | Required |
| ------------ | ------------------------------------------------------------------------- | ------ | -------- |
| `documentId` | Document UUID - unique identifier for the document                        | string | Yes      |
| `content`    | The document content to update (HTML or Markdown based on document type)  | string | Yes      |
| `type`       | Content type - 'html' for HTML content or 'markdown' for Markdown content | string | No       |

## Configuration

To use Swagger Portal tools, you need to configure the `SWAGGER_API_KEY` environment variable with your Swagger API token.

## Common Use Cases

1. **Portal Discovery**: Use `list_portals` to find available portals you have access to.
2. **Portal Management**: Create and update portals using the respective tools.
3. **Product Organization**: Manage products within portals for better API organization.
4. **Content Publishing**: Use `publish_portal_product` to make product content live or preview changes before publishing.
5. **Content Structure Management**: Organize product content using sections and table of contents for better navigation.
6. **Document Management**: Create, update, and manage documentation content within portal products.
7. **Portal Content Architecture**: Build comprehensive documentation portals with nested content structures and API references.
