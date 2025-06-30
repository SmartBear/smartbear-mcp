# API Hub

## Environment Variables

- `API_HUB_API_KEY`: Required. The API key for API Hub MCP tools.
- `MCP_SERVER_INSIGHT_HUB_API_KEY`: Optional. If set, enables error reporting of the _MCP_server_ code via the BugSnag SDK. This is useful for debugging and monitoring of the MCP server itself and shouldn't be set to the same API key as your app.

## Tools

1. `list_portals`
   - Search for available portals within API Hub. Only portals where you have at least a designer role, either at the product level or organization level, are returned.
2. `create_portal`
   - Create a new portal within API Hub.
3. `get_portal`
   - Retrieve information about a specific portal.
4. `delete_portal`
   - Delete a portal.
5. `update_portal`
   - Update a specific portal's configuration.
6. `list_portal_products`
   - Get products for a specific portal matching your criteria.
7. `create_portal_product`
   - Create a new product within a specific portal.
8. `get_portal_product`
   - Retrieve information about a specific product resource.
9. `delete_portal_product`
   - Delete a product from a specific portal.
10. `update_portal_product`
    - Update a product's settings within a specific portal.