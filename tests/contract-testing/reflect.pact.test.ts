import { PactV3, MatchersV3 } from '@pact-foundation/pact';
import { describe, it, expect } from 'vitest';
import { ReflectClient } from '../../reflect/client.js';

const { like, string, uuid, eachLike, integer } = MatchersV3;

// Pact contract tests for Reflect API
describe('Reflect API Client Pact Tests', () => {
  const provider = new PactV3({
    consumer: 'SmartBearMCPServer',
    provider: 'ReflectAPI',
  });

  describe('Test Suite Management', () => {
    describe('GET /v1/suites', () => {
      it('returns a list of test suites', () => {
        provider
          .given('user has access to test suites')
          .uponReceiving('a request to list test suites')
          .withRequest({
            method: 'GET',
            path: '/v1/suites',
            headers: {
              'X-API-KEY': like('valid-api-key'),
              'Content-Type': 'application/json',
              'User-Agent': like('SmartBear MCP Server/0.4.0'),
            },
          })
          .willRespondWith({
            status: 200,
            headers: {
              'Content-Type': 'application/json',
            },
            body: like(eachLike({
              id: uuid('123e4567-e89b-12d3-a456-426614174000'),
              name: string('E2E Test Suite'),
              description: string('End-to-end testing suite'),
              status: string('active'),
              created_at: string('2024-01-01T00:00:00Z'),
              updated_at: string('2024-01-01T00:00:00Z'),
              test_count: integer(5),
            })),
          });

        return provider.executeTest(async (mockServer) => {
          const client = new ReflectClient('valid-api-key', mockServer.url);
          const suites = await client.listReflectSuites();
          expect(Array.isArray(suites)).toBe(true);
        });
      });
    });

    describe('POST /v1/suites/{suiteId}/executions', () => {
      it('starts a suite execution', () => {
        provider
          .given('suite suite-123 exists and can be executed')
          .uponReceiving('a request to execute a suite')
          .withRequest({
            method: 'POST',
            path: '/v1/suites/suite-123/executions',
            headers: {
              'X-API-KEY': like('valid-api-key'),
              'Content-Type': 'application/json',
            },
          })
          .willRespondWith({
            status: 201,
            headers: {
              'Content-Type': 'application/json',
            },
            body: like({
              id: uuid('456e7890-a12b-34c5-d678-901234567890'),
              suite_id: 'suite-123',
              status: string('queued'),
              created_at: string('2024-01-01T00:00:00Z'),
              started_at: like(null),
              completed_at: like(null),
              total_tests: integer(5),
              passed_tests: integer(0),
              failed_tests: integer(0),
            }),
          });

        return provider.executeTest(async (mockServer) => {
          const client = new ReflectClient('valid-api-key', mockServer.url);
          const execution = await client.executeSuite('suite-123');
          expect(execution.id).toBeDefined();
          expect(execution.status).toBe('queued');
        });
      });
    });

    describe('GET /v1/suites/{suiteId}/executions', () => {
      it('returns suite execution history', () => {
        provider
          .given('suite suite-123 has execution history')
          .uponReceiving('a request to list suite executions')
          .withRequest({
            method: 'GET',
            path: '/v1/suites/suite-123/executions',
            headers: {
              'X-API-KEY': like('valid-api-key'),
            },
          })
          .willRespondWith({
            status: 200,
            headers: {
              'Content-Type': 'application/json',
            },
            body: like(eachLike({
              id: uuid('789abcde-f012-3456-789a-bcdef0123456'),
              suite_id: 'suite-123',
              status: string('completed'),
              created_at: string('2024-01-01T00:00:00Z'),
              started_at: string('2024-01-01T00:01:00Z'),
              completed_at: string('2024-01-01T00:05:00Z'),
              total_tests: integer(5),
              passed_tests: integer(4),
              failed_tests: integer(1),
              duration_ms: integer(240000),
            })),
          });

        return provider.executeTest(async (mockServer) => {
          const client = new ReflectClient('valid-api-key', mockServer.url);
          const executions = await client.listSuiteExecutions('suite-123');
          expect(Array.isArray(executions)).toBe(true);
        });
      });
    });

    describe('GET /v1/suites/{suiteId}/executions/{executionId}', () => {
      it('returns specific execution status', () => {
        provider
          .given('execution execution-456 exists for suite suite-123')
          .uponReceiving('a request to get suite execution status')
          .withRequest({
            method: 'GET',
            path: '/v1/suites/suite-123/executions/execution-456',
            headers: {
              'X-API-KEY': like('valid-api-key'),
            },
          })
          .willRespondWith({
            status: 200,
            headers: {
              'Content-Type': 'application/json',
            },
            body: like({
              id: 'execution-456',
              suite_id: 'suite-123',
              status: string('running'),
              created_at: string('2024-01-01T00:00:00Z'),
              started_at: string('2024-01-01T00:01:00Z'),
              completed_at: like(null),
              total_tests: integer(5),
              passed_tests: integer(2),
              failed_tests: integer(0),
              current_test: string('Login Test'),
              progress: integer(40),
            }),
          });

        return provider.executeTest(async (mockServer) => {
          const client = new ReflectClient('valid-api-key', mockServer.url);
          const execution = await client.getSuiteExecutionStatus('suite-123', 'execution-456');
          expect(execution.id).toBe('execution-456');
          expect(execution.status).toBe('running');
        });
      });
    });

    describe('PATCH /v1/suites/{suiteId}/executions/{executionId}/cancel', () => {
      it('cancels a running suite execution', () => {
        provider
          .given('execution execution-456 is running and can be cancelled')
          .uponReceiving('a request to cancel a suite execution')
          .withRequest({
            method: 'PATCH',
            path: '/v1/suites/suite-123/executions/execution-456/cancel',
            headers: {
              'X-API-KEY': like('valid-api-key'),
            },
          })
          .willRespondWith({
            status: 200,
            headers: {
              'Content-Type': 'application/json',
            },
            body: like({
              id: 'execution-456',
              status: string('cancelled'),
              cancelled_at: string('2024-01-01T00:03:00Z'),
              message: string('Execution cancelled by user'),
            }),
          });

        return provider.executeTest(async (mockServer) => {
          const client = new ReflectClient('valid-api-key', mockServer.url);
          const result = await client.cancelSuiteExecution('suite-123', 'execution-456');
          expect(result.status).toBe('cancelled');
        });
      });
    });
  });

  describe('Individual Test Management', () => {
    describe('GET /v1/tests', () => {
      it('returns a list of individual tests', () => {
        provider
          .given('user has access to individual tests')
          .uponReceiving('a request to list tests')
          .withRequest({
            method: 'GET',
            path: '/v1/tests',
            headers: {
              'X-API-KEY': like('valid-api-key'),
              'Content-Type': 'application/json',
            },
          })
          .willRespondWith({
            status: 200,
            headers: {
              'Content-Type': 'application/json',
            },
            body: like(eachLike({
              id: uuid('abcdef01-2345-6789-abcd-ef0123456789'),
              name: string('Login Test'),
              description: string('Test user login functionality'),
              url: string('https://example.com/login'),
              status: string('active'),
              suite_id: uuid('abcdef01-2345-6789-abcd-ef0123456789'),
              created_at: string('2024-01-01T00:00:00Z'),
              updated_at: string('2024-01-01T00:00:00Z'),
            })),
          });

        return provider.executeTest(async (mockServer) => {
          const client = new ReflectClient('valid-api-key', mockServer.url);
          const tests = await client.listReflectTests();
          expect(Array.isArray(tests)).toBe(true);
        });
      });
    });

    describe('POST /v1/tests/{testId}/executions', () => {
      it('starts an individual test execution', () => {
        provider
          .given('test test-789 exists and can be executed')
          .uponReceiving('a request to run an individual test')
          .withRequest({
            method: 'POST',
            path: '/v1/tests/test-789/executions',
            headers: {
              'X-API-KEY': like('valid-api-key'),
              'Content-Type': 'application/json',
            },
          })
          .willRespondWith({
            status: 201,
            headers: {
              'Content-Type': 'application/json',
            },
            body: like({
              id: uuid('fedcba98-7654-3210-fedc-ba9876543210'),
              test_id: 'test-789',
              status: string('queued'),
              created_at: string('2024-01-01T00:00:00Z'),
              started_at: like(null),
              completed_at: like(null),
              result: like(null),
              error_message: like(null),
            }),
          });

        return provider.executeTest(async (mockServer) => {
          const client = new ReflectClient('valid-api-key', mockServer.url);
          const execution = await client.runReflectTest('test-789');
          expect(execution.id).toBeDefined();
          expect(execution.status).toBe('queued');
        });
      });
    });

    describe('GET /v1/tests/{testId}/executions/{executionId}', () => {
      it('returns individual test execution status', () => {
        provider
          .given('test execution test-execution-101 exists')
          .uponReceiving('a request to get test execution status')
          .withRequest({
            method: 'GET',
            path: '/v1/tests/test-789/executions/test-execution-101',
            headers: {
              'X-API-KEY': like('valid-api-key'),
            },
          })
          .willRespondWith({
            status: 200,
            headers: {
              'Content-Type': 'application/json',
            },
            body: like({
              id: 'test-execution-101',
              test_id: 'test-789',
              status: string('completed'),
              created_at: string('2024-01-01T00:00:00Z'),
              started_at: string('2024-01-01T00:01:00Z'),
              completed_at: string('2024-01-01T00:02:30Z'),
              result: string('passed'),
              duration_ms: integer(90000),
              screenshots: eachLike({
                url: string('https://screenshots.reflect.run/screenshot1.png'),
                step: string('Page loaded'),
              }),
            }),
          });

        return provider.executeTest(async (mockServer) => {
          const client = new ReflectClient('valid-api-key', mockServer.url);
          const execution = await client.getReflectTestStatus('test-789', 'test-execution-101');
          expect(execution.result).toBe('passed');
          expect(execution.status).toBe('completed');
        });
      });
    });
  });

  describe('Error Scenarios', () => {
    describe('Authentication Errors', () => {
      it('returns 401 for missing API key', () => {
        provider
          .given('no API key provided')
          .uponReceiving('a request without API key')
          .withRequest({
            method: 'GET',
            path: '/v1/suites',
          })
          .willRespondWith({
            status: 401,
            headers: {
              'Content-Type': 'application/json',
            },
            body: like({
              error: string('Unauthorized'),
              message: string('API key is required'),
            }),
          });

        return provider.executeTest(async (mockServer) => {
          const response = await fetch(`${mockServer.url}/v1/suites`);
          expect(response.status).toBe(401);
        });
      });

      it('returns 401 for invalid API key', () => {
        provider
          .given('invalid API key provided')
          .uponReceiving('a request with invalid API key')
          .withRequest({
            method: 'GET',
            path: '/v1/suites',
            headers: {
              'X-API-KEY': 'invalid-api-key',
            },
          })
          .willRespondWith({
            status: 401,
            headers: {
              'Content-Type': 'application/json',
            },
            body: like({
              error: string('Unauthorized'),
              message: string('Invalid API key'),
            }),
          });

        return provider.executeTest(async (mockServer) => {
          const response = await fetch(`${mockServer.url}/v1/suites`, {
            headers: {
              'X-API-KEY': 'invalid-api-key',
            },
          });
          expect(response.status).toBe(401);
        });
      });
    });

    describe('Resource Not Found', () => {
      it('returns 404 for non-existent suite', () => {
        provider
          .given('suite non-existent-suite does not exist')
          .uponReceiving('a request for a non-existent suite')
          .withRequest({
            method: 'GET',
            path: '/v1/suites/non-existent-suite/executions',
            headers: {
              'X-API-KEY': like('valid-api-key'),
            },
          })
          .willRespondWith({
            status: 404,
            headers: {
              'Content-Type': 'application/json',
            },
            body: like({
              error: string('Not Found'),
              message: string('Suite not found'),
            }),
          });

        return provider.executeTest(async (mockServer) => {
          const response = await fetch(`${mockServer.url}/v1/suites/non-existent-suite/executions`, {
            headers: {
              'X-API-KEY': 'valid-api-key',
            },
          });
          expect(response.status).toBe(404);
        });
      });

      it('returns 404 for non-existent test', () => {
        provider
          .given('test non-existent-test does not exist')
          .uponReceiving('a request for a non-existent test')
          .withRequest({
            method: 'POST',
            path: '/v1/tests/non-existent-test/executions',
            headers: {
              'X-API-KEY': like('valid-api-key'),
            },
          })
          .willRespondWith({
            status: 404,
            headers: {
              'Content-Type': 'application/json',
            },
            body: like({
              error: string('Not Found'),
              message: string('Test not found'),
            }),
          });

        return provider.executeTest(async (mockServer) => {
          const response = await fetch(`${mockServer.url}/v1/tests/non-existent-test/executions`, {
            method: 'POST',
            headers: {
              'X-API-KEY': 'valid-api-key',
            },
          });
          expect(response.status).toBe(404);
        });
      });

      it('returns 404 for non-existent execution', () => {
        provider
          .given('execution non-existent-execution does not exist')
          .uponReceiving('a request for a non-existent execution')
          .withRequest({
            method: 'GET',
            path: '/v1/suites/suite-123/executions/non-existent-execution',
            headers: {
              'X-API-KEY': like('valid-api-key'),
            },
          })
          .willRespondWith({
            status: 404,
            headers: {
              'Content-Type': 'application/json',
            },
            body: like({
              error: string('Not Found'),
              message: string('Execution not found'),
            }),
          });

        return provider.executeTest(async (mockServer) => {
          const response = await fetch(`${mockServer.url}/v1/suites/suite-123/executions/non-existent-execution`, {
            headers: {
              'X-API-KEY': 'valid-api-key',
            },
          });
          expect(response.status).toBe(404);
        });
      });
    });

    describe('Execution Constraints', () => {
      it('returns 409 when trying to execute a suite that is already running', () => {
        provider
          .given('suite suite-123 is already running')
          .uponReceiving('a request to execute an already running suite')
          .withRequest({
            method: 'POST',
            path: '/v1/suites/suite-123/executions',
            headers: {
              'X-API-KEY': like('valid-api-key'),
            },
          })
          .willRespondWith({
            status: 409,
            headers: {
              'Content-Type': 'application/json',
            },
            body: like({
              error: string('Conflict'),
              message: string('Suite is already running'),
              current_execution_id: uuid('13579bdf-2468-ace0-1357-9bdf2468ace0'),
            }),
          });

        return provider.executeTest(async (mockServer) => {
          const response = await fetch(`${mockServer.url}/v1/suites/suite-123/executions`, {
            method: 'POST',
            headers: {
              'X-API-KEY': 'valid-api-key',
            },
          });
          expect(response.status).toBe(409);
        });
      });

      it('returns 400 when trying to cancel a completed execution', () => {
        provider
          .given('execution execution-456 is already completed')
          .uponReceiving('a request to cancel a completed execution')
          .withRequest({
            method: 'PATCH',
            path: '/v1/suites/suite-123/executions/execution-456/cancel',
            headers: {
              'X-API-KEY': like('valid-api-key'),
            },
          })
          .willRespondWith({
            status: 400,
            headers: {
              'Content-Type': 'application/json',
            },
            body: like({
              error: string('Bad Request'),
              message: string('Cannot cancel a completed execution'),
            }),
          });

        return provider.executeTest(async (mockServer) => {
          const response = await fetch(`${mockServer.url}/v1/suites/suite-123/executions/execution-456/cancel`, {
            method: 'PATCH',
            headers: {
              'X-API-KEY': 'valid-api-key',
            },
          });
          expect(response.status).toBe(400);
        });
      });
    });

    describe('Server Errors', () => {
      it('returns 500 for internal server errors', () => {
        provider
          .given('server encounters an internal error')
          .uponReceiving('a request that causes an internal server error')
          .withRequest({
            method: 'POST',
            path: '/v1/suites/suite-123/executions',
            headers: {
              'X-API-KEY': like('valid-api-key'),
            },
          })
          .willRespondWith({
            status: 500,
            headers: {
              'Content-Type': 'application/json',
            },
            body: like({
              error: string('Internal Server Error'),
              message: string('An unexpected error occurred'),
            }),
          });

        return provider.executeTest(async (mockServer) => {
          const response = await fetch(`${mockServer.url}/v1/suites/suite-123/executions`, {
            method: 'POST',
            headers: {
              'X-API-KEY': 'valid-api-key',
            },
          });
          expect(response.status).toBe(500);
        });
      });
    });
  });
});
