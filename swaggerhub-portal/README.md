# SwaggerHub

## Environment Variables

- `SWAGGER_HUB_API_KEY`: Required. The API key for Swagger Hub-based tools.
- `MCP_SERVER_INSIGHT_HUB_API_KEY`: Optional. If set, enables error reporting of the _MCP_server_ code via the BugSnag SDK. This is useful for debugging and monitoring of the MCP server itself and shouldn't be set to the same API key as your app.

## Tools

1. `list_swaggerhub_portals`
   - Search for available portals. Results are returned only for portals where you have a designer role, either at the product level or organization level.
2. `create_swaggerhub_portal`
   - Create a new portal.
3. `get_swaggerhub_portal`
   - Retrieve information about a portal.
4. `delete_swaggerhub_portal`
   - Delete a portal.
5. `update_swaggerhub_portal`
   - Update a portal.
6. `list_swaggerhub_products`
   - Get products for a specific portal that match your criteria.
7. `create_swaggerhub_product`
   - Create a new product for a specific portal.
8. `get_swaggerhub_product`
   - Retrieve information about a specific product resource.
9. `delete_swaggerhub_product`
   - Delete a product from a specific portal.
10. `update_swaggerhub_product`
   - Update a product in a specific portal.