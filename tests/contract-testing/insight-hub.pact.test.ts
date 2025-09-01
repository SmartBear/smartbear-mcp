import { PactV3, MatchersV3 } from '@pact-foundation/pact';
import { describe, it, expect } from 'vitest';
// import { InsightHubClient } from '../../insight-hub/client.js';

const { like, eachLike, string, integer, uuid } = MatchersV3;

// Pact contract tests for Insight Hub (Bugsnag) API
describe('Insight Hub API Client Pact Tests', () => {
  const provider = new PactV3({
    consumer: 'SmartBearMCPServer',
    provider: 'InsightHubAPI',
  });

  describe('Organization Management', () => {
    describe('GET /user/organizations', () => {
      it('returns a list of organizations for authenticated user', () => {
        provider
          .given('user is authenticated and has organizations')
          .uponReceiving('a request to list user organizations')
          .withRequest({
            method: 'GET',
            path: '/user/organizations',
            headers: {
              'Authorization': like('token valid-auth-token'),
              'Content-Type': 'application/json',
              'X-Bugsnag-API': 'true',
              'X-Version': '2',
              'User-Agent': like('SmartBear MCP Server/0.4.0'),
            },
          })
          .willRespondWith({
            status: 200,
            headers: {
              'Content-Type': 'application/json',
            },
            body: eachLike({
              id: uuid('org-123e4567-e89b-12d3-a456-426614174000'),
              name: string('Test Organization'),
              slug: string('test-org'),
              type: string('standard'),
              created_at: string('2024-01-01T00:00:00.000Z'),
              updated_at: string('2024-01-01T00:00:00.000Z'),
              url: string('https://app.bugsnag.com/test-org'),
            }),
          });

        return provider.executeTest(async (mockServer) => {
          // Mock test - replace with actual client when uncommented
          const response = await fetch(`${mockServer.url}/user/organizations`, {
            headers: {
              'Authorization': 'token valid-auth-token',
              'Content-Type': 'application/json',
              'X-Bugsnag-API': 'true',
              'X-Version': '2',
              'User-Agent': 'SmartBear MCP Server/0.4.0',
            },
          });
          const organizations = await response.json();
          expect(response.status).toBe(200);
          expect(Array.isArray(organizations)).toBe(true);
          expect(organizations[0].id).toBeDefined();
          expect(organizations[0].name).toBeDefined();
        });
      });
    });
  });

  describe('Project Management', () => {
    describe('GET /organizations/{orgId}/projects', () => {
      it('returns projects for an organization with pagination', () => {
        provider
          .given('organization org-123 exists with projects')
          .uponReceiving('a request to get organization projects')
          .withRequest({
            method: 'GET',
            path: like('/organizations/org-123/projects'),
            headers: {
              'Authorization': like('token valid-auth-token'),
              'Content-Type': 'application/json',
              'X-Bugsnag-API': 'true',
              'X-Version': '2',
            },
          })
          .willRespondWith({
            status: 200,
            headers: {
              'Content-Type': 'application/json',
              'Link': like('<https://api.bugsnag.com/organizations/org-123/projects?offset=30>; rel="next"'),
            },
            body: eachLike({
              id: uuid('proj-123e4567-e89b-12d3-a456-426614174000'),
              name: string('Test Project'),
              slug: string('test-project'),
              api_key: string('project-api-key-12345'),
              type: string('javascript'),
              language: string('javascript'),
              created_at: string('2024-01-01T00:00:00.000Z'),
              updated_at: string('2024-01-01T00:00:00.000Z'),
              url: string('https://app.bugsnag.com/test-org/test-project'),
              errors_url: string('https://app.bugsnag.com/test-org/test-project/errors'),
              events_url: string('https://app.bugsnag.com/test-org/test-project/events'),
            }),
          });

        return provider.executeTest(async (mockServer) => {
          const response = await fetch(`${mockServer.url}/organizations/org-123/projects`, {
            headers: {
              'Authorization': 'token valid-auth-token',
              'Content-Type': 'application/json',
              'X-Bugsnag-API': 'true',
              'X-Version': '2',
            },
          });
          const projects = await response.json();
          expect(response.status).toBe(200);
          expect(Array.isArray(projects)).toBe(true);
          expect(projects[0].id).toBeDefined();
          expect(projects[0].api_key).toBeDefined();
        });
      });
    });
  });

  describe('Error Management', () => {
    describe('GET /projects/{projectId}/errors', () => {
      it('returns errors for a project', () => {
        provider
          .given('project proj-123 exists with errors')
          .uponReceiving('a request to list project errors')
          .withRequest({
            method: 'GET',
            path: like('/projects/proj-123/errors'),
            headers: {
              'Authorization': like('token valid-auth-token'),
              'Content-Type': 'application/json',
              'X-Bugsnag-API': 'true',
              'X-Version': '2',
            },
          })
          .willRespondWith({
            status: 200,
            headers: {
              'Content-Type': 'application/json',
            },
            body: eachLike({
              id: uuid('error-123e4567-e89b-12d3-a456-426614174000'),
              error_class: string('TypeError'),
              message: string('Cannot read property \'name\' of undefined'),
              context: string('dashboard/users'),
              severity: string('error'),
              status: string('open'),
              first_seen: string('2024-01-01T00:00:00.000Z'),
              last_seen: string('2024-01-01T01:00:00.000Z'),
              events: integer(42),
              users: integer(15),
              comments: integer(2),
              assignee: like(null),
              assigned_collaborator: like(null),
              url: string('https://app.bugsnag.com/test-org/test-project/errors/error-123'),
            }),
          });

        return provider.executeTest(async (mockServer) => {
          const response = await fetch(`${mockServer.url}/projects/proj-123/errors`, {
            headers: {
              'Authorization': 'token valid-auth-token',
              'Content-Type': 'application/json',
              'X-Bugsnag-API': 'true',
              'X-Version': '2',
            },
          });
          const errors = await response.json();
          expect(response.status).toBe(200);
          expect(Array.isArray(errors)).toBe(true);
          expect(errors[0].error_class).toBeDefined();
          expect(errors[0].status).toBeDefined();
        });
      });
    });

    describe('GET /projects/{projectId}/errors/{errorId}', () => {
      it('returns detailed error information', () => {
        provider
          .given('error error-123 exists in project proj-123')
          .uponReceiving('a request to get error details')
          .withRequest({
            method: 'GET',
            path: '/projects/proj-123/errors/error-123',
            headers: {
              'Authorization': like('token valid-auth-token'),
              'Content-Type': 'application/json',
              'X-Bugsnag-API': 'true',
              'X-Version': '2',
            },
          })
          .willRespondWith({
            status: 200,
            headers: {
              'Content-Type': 'application/json',
            },
            body: {
              id: 'error-123',
              error_class: string('TypeError'),
              message: string('Cannot read property \'name\' of undefined'),
              context: string('dashboard/users'),
              severity: string('error'),
              status: string('open'),
              first_seen: string('2024-01-01T00:00:00.000Z'),
              last_seen: string('2024-01-01T01:00:00.000Z'),
              events: integer(42),
              users: integer(15),
              release_stages: eachLike(string('production')),
              grouping_hash: string('abc123def456'),
              grouping_fields: eachLike({
                name: string('error.class'),
                value: string('TypeError'),
              }),
            },
          });

        return provider.executeTest(async (mockServer) => {
          const response = await fetch(`${mockServer.url}/projects/proj-123/errors/error-123`, {
            headers: {
              'Authorization': 'token valid-auth-token',
              'Content-Type': 'application/json',
              'X-Bugsnag-API': 'true',
              'X-Version': '2',
            },
          });
          const error = await response.json();
          expect(response.status).toBe(200);
          expect(error.id).toBe('error-123');
          expect(error.error_class).toBeDefined();
        });
      });
    });

    describe('PATCH /projects/{projectId}/errors/{errorId}', () => {
      it('updates error status successfully', () => {
        provider
          .given('error error-123 exists and can be updated')
          .uponReceiving('a request to update error status')
          .withRequest({
            method: 'PATCH',
            path: '/projects/proj-123/errors/error-123',
            headers: {
              'Authorization': like('token valid-auth-token'),
              'Content-Type': 'application/json',
              'X-Bugsnag-API': 'true',
              'X-Version': '2',
            },
            body: {
              operation: string('fix'),
            },
          })
          .willRespondWith({
            status: 200,
            headers: {
              'Content-Type': 'application/json',
            },
            body: {
              id: 'error-123',
              status: string('fixed'),
              updated_at: string('2024-01-01T02:00:00.000Z'),
            },
          });

        return provider.executeTest(async (mockServer) => {
          const response = await fetch(`${mockServer.url}/projects/proj-123/errors/error-123`, {
            method: 'PATCH',
            headers: {
              'Authorization': 'token valid-auth-token',
              'Content-Type': 'application/json',
              'X-Bugsnag-API': 'true',
              'X-Version': '2',
            },
            body: JSON.stringify({
              operation: 'fix',
            }),
          });
          const result = await response.json();
          expect(response.status).toBe(200);
          expect(result.status).toBe('fixed');
        });
      });
    });

    describe('GET /projects/{projectId}/events', () => {
      it('returns events for a project with filtering', () => {
        provider
          .given('project proj-123 has events')
          .uponReceiving('a request to list events with filters')
          .withRequest({
            method: 'GET',
            path: '/projects/proj-123/events',
            query: {
              sort: 'timestamp',
              direction: 'desc',
              per_page: '1',
              full_reports: 'true',
              error: 'error-123',
            },
            headers: {
              'Authorization': like('token valid-auth-token'),
              'Content-Type': 'application/json',
              'X-Bugsnag-API': 'true',
              'X-Version': '2',
            },
          })
          .willRespondWith({
            status: 200,
            headers: {
              'Content-Type': 'application/json',
            },
            body: eachLike({
              id: uuid('event-123e4567-e89b-12d3-a456-426614174000'),
              error_id: string('error-123'),
              error_class: string('TypeError'),
              message: string('Cannot read property \'name\' of undefined'),
              context: string('dashboard/users'),
              severity: string('error'),
              unhandled: like(true),
              received_at: string('2024-01-01T01:00:00.000Z'),
              user: {
                id: string('user-456'),
                name: string('John Doe'),
                email: string('john@example.com'),
              },
              app: {
                version: string('1.2.3'),
                release_stage: string('production'),
              },
              device: {
                os_name: string('Web'),
                browser_name: string('Chrome'),
                browser_version: string('120.0.0'),
              },
              exceptions: eachLike({
                error_class: string('TypeError'),
                message: string('Cannot read property \'name\' of undefined'),
                stacktrace: eachLike({
                  file: string('app.js'),
                  line_number: integer(42),
                  column_number: integer(15),
                  method: string('getUserName'),
                  in_project: like(true),
                }),
              }),
            }),
          });

        return provider.executeTest(async (mockServer) => {
          const response = await fetch(`${mockServer.url}/projects/proj-123/events?sort=timestamp&direction=desc&per_page=1&full_reports=true&error=error-123`, {
            headers: {
              'Authorization': 'token valid-auth-token',
              'Content-Type': 'application/json',
              'X-Bugsnag-API': 'true',
              'X-Version': '2',
            },
          });
          const events = await response.json();
          expect(response.status).toBe(200);
          expect(Array.isArray(events)).toBe(true);
          expect(events[0].exceptions).toBeDefined();
        });
      });
    });
  });

  describe('Event Fields and Filters', () => {
    describe('GET /projects/{projectId}/event_fields', () => {
      it('returns available event filter fields', () => {
        provider
          .given('project proj-123 has event fields configured')
          .uponReceiving('a request to get project event fields')
          .withRequest({
            method: 'GET',
            path: '/projects/proj-123/event_fields',
            headers: {
              'Authorization': like('token valid-auth-token'),
              'Content-Type': 'application/json',
              'X-Bugsnag-API': 'true',
              'X-Version': '2',
            },
          })
          .willRespondWith({
            status: 200,
            headers: {
              'Content-Type': 'application/json',
            },
            body: eachLike({
              display_id: string('user.email'),
              display_name: string('User Email'),
              type: string('string'),
              custom: like(false),
              filterable: like(true),
              sortable: like(true),
              pivotable: like(true),
              searchable: like(true),
            }),
          });

        return provider.executeTest(async (mockServer) => {
          const response = await fetch(`${mockServer.url}/projects/proj-123/event_fields`, {
            headers: {
              'Authorization': 'token valid-auth-token',
              'Content-Type': 'application/json',
              'X-Bugsnag-API': 'true',
              'X-Version': '2',
            },
          });
          const fields = await response.json();
          expect(response.status).toBe(200);
          expect(Array.isArray(fields)).toBe(true);
          expect(fields[0].display_id).toBeDefined();
          expect(fields[0].filterable).toBeDefined();
        });
      });
    });
  });

  describe('Error Scenarios', () => {
    describe('Authentication Errors', () => {
      it('returns 401 for missing authentication token', () => {
        provider
          .given('no authentication token provided')
          .uponReceiving('a request without authentication')
          .withRequest({
            method: 'GET',
            path: '/user/organizations',
            headers: {
              'Content-Type': 'application/json',
              'X-Bugsnag-API': 'true',
              'X-Version': '2',
            },
          })
          .willRespondWith({
            status: 401,
            headers: {
              'Content-Type': 'application/json',
            },
            body: {
              error: string('Unauthorized'),
              message: string('Authentication required'),
            },
          });

        return provider.executeTest(async (mockServer) => {
          const response = await fetch(`${mockServer.url}/user/organizations`, {
            headers: {
              'Content-Type': 'application/json',
              'X-Bugsnag-API': 'true',
              'X-Version': '2',
            },
          });
          expect(response.status).toBe(401);
        });
      });

      it('returns 401 for invalid authentication token', () => {
        provider
          .given('invalid authentication token provided')
          .uponReceiving('a request with invalid authentication')
          .withRequest({
            method: 'GET',
            path: '/user/organizations',
            headers: {
              'Authorization': 'token invalid-token',
              'Content-Type': 'application/json',
              'X-Bugsnag-API': 'true',
              'X-Version': '2',
            },
          })
          .willRespondWith({
            status: 401,
            headers: {
              'Content-Type': 'application/json',
            },
            body: {
              error: string('Unauthorized'),
              message: string('Invalid authentication token'),
            },
          });

        return provider.executeTest(async (mockServer) => {
          const response = await fetch(`${mockServer.url}/user/organizations`, {
            headers: {
              'Authorization': 'token invalid-token',
              'Content-Type': 'application/json',
              'X-Bugsnag-API': 'true',
              'X-Version': '2',
            },
          });
          expect(response.status).toBe(401);
        });
      });
    });

    describe('Resource Not Found', () => {
      it('returns 404 for non-existent project', () => {
        provider
          .given('project non-existent-project does not exist')
          .uponReceiving('a request for a non-existent project')
          .withRequest({
            method: 'GET',
            path: '/projects/non-existent-project/errors',
            headers: {
              'Authorization': like('token valid-auth-token'),
              'Content-Type': 'application/json',
              'X-Bugsnag-API': 'true',
              'X-Version': '2',
            },
          })
          .willRespondWith({
            status: 404,
            headers: {
              'Content-Type': 'application/json',
            },
            body: {
              error: string('Not Found'),
              message: string('Project not found'),
            },
          });

        return provider.executeTest(async (mockServer) => {
          const response = await fetch(`${mockServer.url}/projects/non-existent-project/errors`, {
            headers: {
              'Authorization': 'token valid-auth-token',
              'Content-Type': 'application/json',
              'X-Bugsnag-API': 'true',
              'X-Version': '2',
            },
          });
          expect(response.status).toBe(404);
        });
      });

      it('returns 404 for non-existent error', () => {
        provider
          .given('error non-existent-error does not exist')
          .uponReceiving('a request for a non-existent error')
          .withRequest({
            method: 'GET',
            path: '/projects/proj-123/errors/non-existent-error',
            headers: {
              'Authorization': like('token valid-auth-token'),
              'Content-Type': 'application/json',
              'X-Bugsnag-API': 'true',
              'X-Version': '2',
            },
          })
          .willRespondWith({
            status: 404,
            headers: {
              'Content-Type': 'application/json',
            },
            body: {
              error: string('Not Found'),
              message: string('Error not found'),
            },
          });

        return provider.executeTest(async (mockServer) => {
          const response = await fetch(`${mockServer.url}/projects/proj-123/errors/non-existent-error`, {
            headers: {
              'Authorization': 'token valid-auth-token',
              'Content-Type': 'application/json',
              'X-Bugsnag-API': 'true',
              'X-Version': '2',
            },
          });
          expect(response.status).toBe(404);
        });
      });
    });

    describe('Validation Errors', () => {
      it('returns 400 for invalid error update operation', () => {
        provider
          .given('error error-123 exists but operation is invalid')
          .uponReceiving('a request with invalid error update operation')
          .withRequest({
            method: 'PATCH',
            path: '/projects/proj-123/errors/error-123',
            headers: {
              'Authorization': like('token valid-auth-token'),
              'Content-Type': 'application/json',
              'X-Bugsnag-API': 'true',
              'X-Version': '2',
            },
            body: {
              operation: 'invalid-operation',
            },
          })
          .willRespondWith({
            status: 400,
            headers: {
              'Content-Type': 'application/json',
            },
            body: {
              error: string('Bad Request'),
              message: string('Invalid operation'),
              details: eachLike({
                field: string('operation'),
                message: string('Operation must be one of: open, fix, ignore, discard, undiscard'),
              }),
            },
          });

        return provider.executeTest(async (mockServer) => {
          const response = await fetch(`${mockServer.url}/projects/proj-123/errors/error-123`, {
            method: 'PATCH',
            headers: {
              'Authorization': 'token valid-auth-token',
              'Content-Type': 'application/json',
              'X-Bugsnag-API': 'true',
              'X-Version': '2',
            },
            body: JSON.stringify({
              operation: 'invalid-operation',
            }),
          });
          expect(response.status).toBe(400);
        });
      });
    });

    describe('Rate Limiting', () => {
      it('returns 429 when rate limit is exceeded', () => {
        provider
          .given('rate limit has been exceeded')
          .uponReceiving('a request when rate limit exceeded')
          .withRequest({
            method: 'GET',
            path: '/user/organizations',
            headers: {
              'Authorization': like('token valid-auth-token'),
              'Content-Type': 'application/json',
              'X-Bugsnag-API': 'true',
              'X-Version': '2',
            },
          })
          .willRespondWith({
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'Retry-After': '60',
            },
            body: {
              error: string('Too Many Requests'),
              message: string('Rate limit exceeded'),
              retry_after: integer(60),
            },
          });

        return provider.executeTest(async (mockServer) => {
          const response = await fetch(`${mockServer.url}/user/organizations`, {
            headers: {
              'Authorization': 'token valid-auth-token',
              'Content-Type': 'application/json',
              'X-Bugsnag-API': 'true',
              'X-Version': '2',
            },
          });
          expect(response.status).toBe(429);
          expect(response.headers.get('Retry-After')).toBe('60');
        });
      });
    });
  });
});
