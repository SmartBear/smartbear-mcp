import { PactV3, MatchersV3 } from '@pact-foundation/pact';
import { describe, it, expect } from 'vitest';
// import { ApiHubClient } from '../../api-hub/client.js';

const { like, string, uuid, eachLike } = MatchersV3;

// Pact contract tests for API Hub (SwaggerHub Portal) API
describe('API Hub Client Pact Tests', () => {
  const provider = new PactV3({
    consumer: 'SmartBearMCPServer',
    provider: 'SwaggerHubPortalAPI',
  });

  describe('Portal Management', () => {
    describe('GET /v1/portals', () => {
      it('returns a list of portals', () => {
        provider
          .given('user has access to portals')
          .uponReceiving('a request to get all portals')
          .withRequest({
            method: 'GET',
            path: '/v1/portals',
            headers: {
              'Authorization': like('Bearer valid-token'),
              'Content-Type': 'application/json',
              'User-Agent': like('SmartBear MCP Server/0.4.0'),
            },
          })
          .willRespondWith({
            status: 200,
            headers: {
              'Content-Type': 'application/json',
            },
            body: eachLike({
              id: uuid('123e4567-e89b-12d3-a456-426614174000'),
              name: string('Test Portal'),
              subdomain: string('test-portal'),
              description: string('A test portal for API documentation'),
              created_at: string('2024-01-01T00:00:00Z'),
              updated_at: string('2024-01-01T00:00:00Z'),
              offline: like(false),
              routing: string('browser'),
            }),
          });

        return provider.executeTest(async (mockServer) => {
          // Note: Uncomment when using with actual client
          // const client = new ApiHubClient('valid-token');
          // client.baseUrl = mockServer.url; // Override base URL for testing
          // const portals = await client.getPortals();
          // expect(portals).toBeDefined();
          // expect(Array.isArray(portals)).toBe(true);
          
          // Mock test for now
          const response = await fetch(`${mockServer.url}/v1/portals`, {
            headers: {
              'Authorization': 'Bearer valid-token',
              'Content-Type': 'application/json',
              'User-Agent': 'SmartBear MCP Server/0.4.0',
            },
          });
          const portals = await response.json();
          expect(portals).toBeDefined();
          expect(Array.isArray(portals)).toBe(true);
        });
      });
    });

    describe('POST /v1/portals', () => {
      it('creates a new portal', () => {
        provider
          .given('user has permission to create portals')
          .uponReceiving('a request to create a new portal')
          .withRequest({
            method: 'POST',
            path: '/v1/portals',
            headers: {
              'Authorization': like('Bearer valid-token'),
              'Content-Type': 'application/json',
            },
            body: {
              name: string('New Test Portal'),
              subdomain: string('new-test-portal'),
              description: string('A new test portal'),
              swaggerHubOrganizationId: uuid('org-uuid'),
            },
          })
          .willRespondWith({
            status: 201,
            headers: {
              'Content-Type': 'application/json',
            },
            body: {
              id: uuid('new-portal-uuid'),
              name: 'New Test Portal',
              subdomain: 'new-test-portal',
              description: 'A new test portal',
              swaggerHubOrganizationId: 'org-uuid',
              created_at: like('2024-01-01T00:00:00Z'),
              updated_at: like('2024-01-01T00:00:00Z'),
            },
          });

        return provider.executeTest(async (mockServer) => {
          const response = await fetch(`${mockServer.url}/v1/portals`, {
            method: 'POST',
            headers: {
              'Authorization': 'Bearer valid-token',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: 'New Test Portal',
              subdomain: 'new-test-portal',
              description: 'A new test portal',
              swaggerHubOrganizationId: 'org-uuid',
            }),
          });
          const portal = await response.json();
          expect(response.status).toBe(201);
          expect(portal.id).toBeDefined();
          expect(portal.name).toBe('New Test Portal');
        });
      });
    });

    describe('GET /v1/portals/{portalId}', () => {
      it('returns a specific portal', () => {
        provider
          .given('portal with ID portal-123 exists')
          .uponReceiving('a request to get a specific portal')
          .withRequest({
            method: 'GET',
            path: '/v1/portals/portal-123',
            headers: {
              'Authorization': like('Bearer valid-token'),
            },
          })
          .willRespondWith({
            status: 200,
            headers: {
              'Content-Type': 'application/json',
            },
            body: {
              id: 'portal-123',
              name: string('Specific Portal'),
              subdomain: string('specific-portal'),
              description: string('Description of specific portal'),
              offline: like(false),
              routing: string('browser'),
            },
          });

        return provider.executeTest(async (mockServer) => {
          const response = await fetch(`${mockServer.url}/v1/portals/portal-123`, {
            headers: {
              'Authorization': 'Bearer valid-token',
            },
          });
          const portal = await response.json();
          expect(response.status).toBe(200);
          expect(portal.id).toBe('portal-123');
          expect(portal.name).toBeDefined();
        });
      });
    });

    describe('PATCH /v1/portals/{portalId}', () => {
      it('updates a portal successfully', () => {
        provider
          .given('portal with ID portal-123 exists and can be updated')
          .uponReceiving('a request to update a portal')
          .withRequest({
            method: 'PATCH',
            path: '/v1/portals/portal-123',
            headers: {
              'Authorization': like('Bearer valid-token'),
              'Content-Type': 'application/json',
            },
            body: {
              name: 'Updated Portal Name',
              description: 'Updated description',
            },
          })
          .willRespondWith({
            status: 200,
            headers: {
              'Content-Type': 'application/json',
            },
            body: {
              id: 'portal-123',
              name: 'Updated Portal Name',
              description: 'Updated description',
              updated_at: like('2024-01-01T00:00:00Z'),
            },
          });

        return provider.executeTest(async (mockServer) => {
          const response = await fetch(`${mockServer.url}/v1/portals/portal-123`, {
            method: 'PATCH',
            headers: {
              'Authorization': 'Bearer valid-token',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: 'Updated Portal Name',
              description: 'Updated description',
            }),
          });
          const portal = await response.json();
          expect(response.status).toBe(200);
          expect(portal.name).toBe('Updated Portal Name');
        });
      });
    });

    describe('DELETE /v1/portals/{portalId}', () => {
      it('deletes a portal successfully', () => {
        provider
          .given('portal with ID portal-123 exists and can be deleted')
          .uponReceiving('a request to delete a portal')
          .withRequest({
            method: 'DELETE',
            path: '/v1/portals/portal-123',
            headers: {
              'Authorization': like('Bearer valid-token'),
            },
          })
          .willRespondWith({
            status: 204,
          });

        return provider.executeTest(async (mockServer) => {
          const response = await fetch(`${mockServer.url}/v1/portals/portal-123`, {
            method: 'DELETE',
            headers: {
              'Authorization': 'Bearer valid-token',
            },
          });
          expect(response.status).toBe(204);
        });
      });
    });
  });

  describe('Product Management', () => {
    describe('GET /v1/portals/{portalId}/products', () => {
      it('returns products for a portal', () => {
        provider
          .given('portal portal-123 exists with products')
          .uponReceiving('a request to get portal products')
          .withRequest({
            method: 'GET',
            path: '/v1/portals/portal-123/products',
            headers: {
              'Authorization': like('Bearer valid-token'),
            },
          })
          .willRespondWith({
            status: 200,
            headers: {
              'Content-Type': 'application/json',
            },
            body: eachLike({
              id: uuid('product-123'),
              name: string('Test Product'),
              type: string('api'),
              description: string('A test API product'),
              version: string('1.0.0'),
              published: like(true),
            }),
          });

        return provider.executeTest(async (mockServer) => {
          const response = await fetch(`${mockServer.url}/v1/portals/portal-123/products`, {
            headers: {
              'Authorization': 'Bearer valid-token',
            },
          });
          const products = await response.json();
          expect(response.status).toBe(200);
          expect(Array.isArray(products)).toBe(true);
        });
      });
    });

    describe('POST /v1/portals/{portalId}/products', () => {
      it('creates a new product in a portal', () => {
        provider
          .given('portal portal-123 exists and can have products added')
          .uponReceiving('a request to create a product in a portal')
          .withRequest({
            method: 'POST',
            path: '/v1/portals/portal-123/products',
            headers: {
              'Authorization': like('Bearer valid-token'),
              'Content-Type': 'application/json',
            },
            body: {
              name: 'New API Product',
              type: 'api',
              description: 'A new API product',
              version: '1.0.0',
            },
          })
          .willRespondWith({
            status: 201,
            headers: {
              'Content-Type': 'application/json',
            },
            body: {
              id: uuid('new-product-uuid'),
              name: 'New API Product',
              type: 'api',
              description: 'A new API product',
              version: '1.0.0',
              created_at: like('2024-01-01T00:00:00Z'),
            },
          });

        return provider.executeTest(async (mockServer) => {
          const response = await fetch(`${mockServer.url}/v1/portals/portal-123/products`, {
            method: 'POST',
            headers: {
              'Authorization': 'Bearer valid-token',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: 'New API Product',
              type: 'api',
              description: 'A new API product',
              version: '1.0.0',
            }),
          });
          const product = await response.json();
          expect(response.status).toBe(201);
          expect(product.id).toBeDefined();
          expect(product.name).toBe('New API Product');
        });
      });
    });

    describe('GET /v1/products/{productId}', () => {
      it('returns a specific product', () => {
        provider
          .given('product with ID product-123 exists')
          .uponReceiving('a request to get a specific product')
          .withRequest({
            method: 'GET',
            path: '/v1/products/product-123',
            headers: {
              'Authorization': like('Bearer valid-token'),
            },
          })
          .willRespondWith({
            status: 200,
            headers: {
              'Content-Type': 'application/json',
            },
            body: {
              id: 'product-123',
              name: string('Specific Product'),
              type: string('api'),
              description: string('A specific API product'),
              version: string('1.0.0'),
              published: like(true),
            },
          });

        return provider.executeTest(async (mockServer) => {
          const response = await fetch(`${mockServer.url}/v1/products/product-123`, {
            headers: {
              'Authorization': 'Bearer valid-token',
            },
          });
          const product = await response.json();
          expect(response.status).toBe(200);
          expect(product.id).toBe('product-123');
        });
      });
    });

    describe('DELETE /v1/products/{productId}', () => {
      it('deletes a product successfully', () => {
        provider
          .given('product with ID product-123 exists and can be deleted')
          .uponReceiving('a request to delete a product')
          .withRequest({
            method: 'DELETE',
            path: '/v1/products/product-123',
            headers: {
              'Authorization': like('Bearer valid-token'),
            },
          })
          .willRespondWith({
            status: 204,
          });

        return provider.executeTest(async (mockServer) => {
          const response = await fetch(`${mockServer.url}/v1/products/product-123`, {
            method: 'DELETE',
            headers: {
              'Authorization': 'Bearer valid-token',
            },
          });
          expect(response.status).toBe(204);
        });
      });
    });
  });

  describe('Error Scenarios', () => {
    describe('Authentication Errors', () => {
      it('returns 401 for missing authorization', () => {
        provider
          .given('no authorization token provided')
          .uponReceiving('a request without authorization')
          .withRequest({
            method: 'GET',
            path: '/v1/portals',
          })
          .willRespondWith({
            status: 401,
            headers: {
              'Content-Type': 'application/json',
            },
            body: {
              error: string('Unauthorized'),
              message: string('Missing or invalid authorization token'),
            },
          });

        return provider.executeTest(async (mockServer) => {
          const response = await fetch(`${mockServer.url}/v1/portals`);
          expect(response.status).toBe(401);
        });
      });

      it('returns 401 for invalid authorization token', () => {
        provider
          .given('invalid authorization token provided')
          .uponReceiving('a request with invalid authorization')
          .withRequest({
            method: 'GET',
            path: '/v1/portals',
            headers: {
              'Authorization': 'Bearer invalid-token',
            },
          })
          .willRespondWith({
            status: 401,
            headers: {
              'Content-Type': 'application/json',
            },
            body: {
              error: string('Unauthorized'),
              message: string('Invalid authorization token'),
            },
          });

        return provider.executeTest(async (mockServer) => {
          const response = await fetch(`${mockServer.url}/v1/portals`, {
            headers: {
              'Authorization': 'Bearer invalid-token',
            },
          });
          expect(response.status).toBe(401);
        });
      });
    });

    describe('Resource Not Found', () => {
      it('returns 404 for non-existent portal', () => {
        provider
          .given('portal with ID non-existent-portal does not exist')
          .uponReceiving('a request for a non-existent portal')
          .withRequest({
            method: 'GET',
            path: '/v1/portals/non-existent-portal',
            headers: {
              'Authorization': like('Bearer valid-token'),
            },
          })
          .willRespondWith({
            status: 404,
            headers: {
              'Content-Type': 'application/json',
            },
            body: {
              error: string('Not Found'),
              message: string('Portal not found'),
            },
          });

        return provider.executeTest(async (mockServer) => {
          const response = await fetch(`${mockServer.url}/v1/portals/non-existent-portal`, {
            headers: {
              'Authorization': 'Bearer valid-token',
            },
          });
          expect(response.status).toBe(404);
        });
      });

      it('returns 404 for non-existent product', () => {
        provider
          .given('product with ID non-existent-product does not exist')
          .uponReceiving('a request for a non-existent product')
          .withRequest({
            method: 'GET',
            path: '/v1/products/non-existent-product',
            headers: {
              'Authorization': like('Bearer valid-token'),
            },
          })
          .willRespondWith({
            status: 404,
            headers: {
              'Content-Type': 'application/json',
            },
            body: {
              error: string('Not Found'),
              message: string('Product not found'),
            },
          });

        return provider.executeTest(async (mockServer) => {
          const response = await fetch(`${mockServer.url}/v1/products/non-existent-product`, {
            headers: {
              'Authorization': 'Bearer valid-token',
            },
          });
          expect(response.status).toBe(404);
        });
      });
    });

    describe('Validation Errors', () => {
      it('returns 400 for invalid portal creation data', () => {
        provider
          .given('user has permission to create portals')
          .uponReceiving('a request to create a portal with invalid data')
          .withRequest({
            method: 'POST',
            path: '/v1/portals',
            headers: {
              'Authorization': like('Bearer valid-token'),
              'Content-Type': 'application/json',
            },
            body: {
              name: '',  // Invalid: empty name
              subdomain: 'invalid subdomain!', // Invalid: contains spaces and special chars
            },
          })
          .willRespondWith({
            status: 400,
            headers: {
              'Content-Type': 'application/json',
            },
            body: {
              error: string('Bad Request'),
              message: string('Invalid portal data'),
              details: eachLike({
                field: string('name'),
                message: string('Name cannot be empty'),
              }),
            },
          });

        return provider.executeTest(async (mockServer) => {
          const response = await fetch(`${mockServer.url}/v1/portals`, {
            method: 'POST',
            headers: {
              'Authorization': 'Bearer valid-token',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: '',
              subdomain: 'invalid subdomain!',
            }),
          });
          expect(response.status).toBe(400);
        });
      });
    });
  });
});
