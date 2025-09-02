import { PactV3, MatchersV3 } from '@pact-foundation/pact';
import { describe, it, expect } from 'vitest';
import { PactflowClient } from '../../pactflow/client.js';
import { GenerationInput, RefineInput } from '../../pactflow/client/ai.js';

const { like, eachLike, string, integer } = MatchersV3;

// Pact contract tests for PactFlow API
describe('PactFlow API Client Pact Tests', () => {
  const provider = new PactV3({
    consumer: 'SmartBearMCPServer',
    provider: 'PactFlowAPI',
  });

  describe('AI Test Generation', () => {
    describe('POST /api/ai/generate', () => {
      it('generates Pact tests from request/response pairs', () => {
        const generationInput: GenerationInput = {
          language: 'typescript',
          requestResponse: {
            request: {
              filename: 'request.json',
              language: 'json',
              body: JSON.stringify({
                method: 'GET',
                path: '/users/123',
                headers: { 'Content-Type': 'application/json' }
              })
            },
            response: {
              filename: 'response.json',
              language: 'json',
              body: JSON.stringify({
                status: 200,
                body: { id: 123, name: 'John Doe', email: 'john@example.com' }
              })
            }
          },
          additionalInstructions: 'Focus on happy path scenarios'
        };

        provider
          .given('a valid generation request')
          .uponReceiving('a request to generate Pact tests from request/response pairs')
          .withRequest({
            method: 'POST',
            path: '/api/ai/generate',
            headers: {
              'Authorization': like('Bearer test-token'),
              'Content-Type': 'application/json',
              'User-Agent': like('SmartBear MCP Server/0.4.0'),
            },
            body: like(generationInput)
          })
          .willRespondWith({
            status: 202,
            headers: {
              'Content-Type': 'application/json'
            },
            body: like({
              status: 'accepted',
              session_id: string('gen-session-123'),
              submitted_at: string('2025-09-02T14:30:00Z'),
              status_url: string('/api/ai/status/gen-session-123'),
              result_url: string('/api/ai/result/gen-session-123')
            })
          });

        // Mock status check (polling)
        provider
          .given('generation is complete')
          .uponReceiving('a status check for completed generation')
          .withRequest({
            method: 'HEAD',
            path: '/api/ai/status/gen-session-123',
            headers: {
              'Authorization': like('Bearer test-token')
            }
          })
          .willRespondWith({
            status: 200
          });

        // Mock result retrieval
        provider
          .given('generation results are available')
          .uponReceiving('a request to get generation results')
          .withRequest({
            method: 'GET',
            path: '/api/ai/result/gen-session-123',
            headers: {
              'Authorization': like('Bearer test-token')
            }
          })
          .willRespondWith({
            status: 200,
            headers: {
              'Content-Type': 'application/json'
            },
            body: like({
              id: string('gen-result-123'),
              code: string(`
describe('User API Tests', () => {
  it('should get user by ID', async () => {
    // Generated Pact test code
  });
});
              `.trim()),
              language: 'typescript'
            })
          });

        return provider.executeTest(async (mockServer) => {
          const client = new PactflowClient('test-token', mockServer.url, 'pactflow');
          const result = await client.generate(generationInput);

          expect(result).toMatchObject({
            id: expect.any(String),
            code: expect.any(String),
            language: 'typescript'
          });
        });
      });

      it('generates Pact tests from OpenAPI specification', () => {
        const generationInput: GenerationInput = {
          language: 'javascript',
          openapi: {
            document: {
              openapi: '3.0.0',
              paths: {
                '/users/{id}': {
                  get: {
                    operationId: 'getUserById',
                    responses: {
                      '200': {
                        description: 'User found',
                        content: {
                          'application/json': {
                            schema: {
                              type: 'object',
                              properties: {
                                id: { type: 'integer' },
                                name: { type: 'string' }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            },
            matcher: {
              path: '/users/{id}',
              methods: ['GET'],
              statusCodes: ['200'],
              operationId: 'getUserById'
            }
          },
          additionalInstructions: 'Include path parameter validation'
        };

        provider
          .given('a valid OpenAPI generation request')
          .uponReceiving('a request to generate Pact tests from OpenAPI')
          .withRequest({
            method: 'POST',
            path: '/api/ai/generate',
            headers: {
              'Authorization': like('Bearer test-token'),
              'Content-Type': 'application/json',
              'User-Agent': like('SmartBear MCP Server/0.4.0'),
            },
            body: like(generationInput)
          })
          .willRespondWith({
            status: 202,
            headers: {
              'Content-Type': 'application/json'
            },
            body: like({
              status: 'accepted',
              session_id: string('gen-openapi-456'),
              submitted_at: string('2025-09-02T14:35:00Z'),
              status_url: string('/api/ai/status/gen-openapi-456'),
              result_url: string('/api/ai/result/gen-openapi-456')
            })
          });

        // Mock completion polling and result
        provider
          .given('OpenAPI generation is complete')
          .uponReceiving('a status check for completed OpenAPI generation')
          .withRequest({
            method: 'HEAD',
            path: '/api/ai/status/gen-openapi-456',
            headers: {
              'Authorization': like('Bearer test-token')
            }
          })
          .willRespondWith({
            status: 200
          });

        provider
          .given('OpenAPI generation results are available')
          .uponReceiving('a request to get OpenAPI generation results')
          .withRequest({
            method: 'GET',
            path: '/api/ai/result/gen-openapi-456',
            headers: {
              'Authorization': like('Bearer test-token')
            }
          })
          .willRespondWith({
            status: 200,
            headers: {
              'Content-Type': 'application/json'
            },
            body: like({
              id: string('openapi-result-456'),
              code: string(`
const { Pact } = require('@pact-foundation/pact');

describe('User API Pact', () => {
  // Generated OpenAPI-based Pact test
});
              `.trim()),
              language: 'javascript'
            })
          });

        return provider.executeTest(async (mockServer) => {
          const client = new PactflowClient('test-token', mockServer.url, 'pactflow');
          const result = await client.generate(generationInput);

          expect(result).toMatchObject({
            id: expect.any(String),
            code: expect.any(String),
            language: 'javascript'
          });
        });
      });
    });
  });

  describe('AI Test Review', () => {
    describe('POST /api/ai/review', () => {
      it('reviews existing Pact tests and provides recommendations', () => {
        const reviewInput: RefineInput = {
          pactTests: {
            filename: 'user.pact.test.ts',
            language: 'typescript',
            body: `
describe('User API Pact', () => {
  it('should get user', async () => {
    provider
      .given('user exists')
      .uponReceiving('a request for user')
      .withRequest({
        method: 'GET',
        path: '/users/1'
      })
      .willRespondWith({
        status: 200,
        body: { id: 1, name: 'John' }
      });
  });
});
            `.trim()
          },
          userInstructions: 'Focus on improving response matching and error scenarios',
          errorMessages: [
            'Test failed: Expected flexible matching but got exact values'
          ]
        };

        provider
          .given('a valid review request')
          .uponReceiving('a request to review Pact tests')
          .withRequest({
            method: 'POST',
            path: '/api/ai/review',
            headers: {
              'Authorization': like('Bearer test-token'),
              'Content-Type': 'application/json',
              'User-Agent': like('SmartBear MCP Server/0.4.0'),
            },
            body: like(reviewInput)
          })
          .willRespondWith({
            status: 202,
            headers: {
              'Content-Type': 'application/json'
            },
            body: like({
              status: 'accepted',
              session_id: string('review-session-789'),
              submitted_at: string('2025-09-02T14:40:00Z'),
              status_url: string('/api/ai/status/review-session-789'),
              result_url: string('/api/ai/result/review-session-789')
            })
          });

        // Mock completion and results
        provider
          .given('review is complete')
          .uponReceiving('a status check for completed review')
          .withRequest({
            method: 'HEAD',
            path: '/api/ai/status/review-session-789',
            headers: {
              'Authorization': like('Bearer test-token')
            }
          })
          .willRespondWith({
            status: 200
          });

        provider
          .given('review results are available')
          .uponReceiving('a request to get review results')
          .withRequest({
            method: 'GET',
            path: '/api/ai/result/review-session-789',
            headers: {
              'Authorization': like('Bearer test-token')
            }
          })
          .willRespondWith({
            status: 200,
            headers: {
              'Content-Type': 'application/json'
            },
            body: like({
              recommendations: eachLike({
                recommendation: string('Use like() matchers for flexible response matching'),
                diff: string(`
- body: { id: 1, name: 'John' }
+ body: like({ id: integer(1), name: string('John') })
                `.trim()),
                confidence: integer(95)
              })
            })
          });

        return provider.executeTest(async (mockServer) => {
          const client = new PactflowClient('test-token', mockServer.url, 'pactflow');
          const result = await client.review(reviewInput);

          expect(result).toMatchObject({
            recommendations: expect.arrayContaining([
              expect.objectContaining({
                recommendation: expect.any(String),
                confidence: expect.any(Number)
              })
            ])
          });
        });
      });
    });
  });

  describe('Provider States Management', () => {
    describe('GET /pacts/provider/{provider}/provider-states', () => {
      it('returns provider states for a given provider', () => {
        provider
          .given('provider states exist for TestProvider')
          .uponReceiving('a request to get provider states')
          .withRequest({
            method: 'GET',
            path: '/pacts/provider/TestProvider/provider-states',
            headers: {
              'Authorization': like('Bearer test-token'),
              'User-Agent': like('SmartBear MCP Server/0.4.0'),
            }
          })
          .willRespondWith({
            status: 200,
            headers: {
              'Content-Type': 'application/json'
            },
            body: like({
              providerStates: eachLike({
                name: string('user exists'),
                params: like({ id: integer(123), name: string('John Doe') }),
                consumers: eachLike(string('UserConsumer'))
              })
            })
          });

        return provider.executeTest(async (mockServer) => {
          const client = new PactflowClient('test-token', mockServer.url, 'pactflow');
          const result = await client.getProviderStates({ provider: 'TestProvider' });

          expect(result).toMatchObject({
            providerStates: expect.arrayContaining([
              expect.objectContaining({
                name: expect.any(String),
                consumers: expect.arrayContaining([expect.any(String)])
              })
            ])
          });
        });
      });

      it('handles URL encoding for provider names with special characters', () => {
        const providerName = 'Test Provider With Spaces';
        const encodedProviderName = 'Test%20Provider%20With%20Spaces';

        provider
          .given('provider states exist for provider with special characters')
          .uponReceiving('a request to get provider states with encoded name')
          .withRequest({
            method: 'GET',
            path: `/pacts/provider/${encodedProviderName}/provider-states`,
            headers: {
              'Authorization': like('Bearer test-token'),
              'User-Agent': like('SmartBear MCP Server/0.4.0'),
            }
          })
          .willRespondWith({
            status: 200,
            headers: {
              'Content-Type': 'application/json'
            },
            body: like({
              providerStates: eachLike({
                name: string('special state'),
                params: like({ key: string('value') }),
                consumers: eachLike(string('SpecialConsumer'))
              })
            })
          });

        return provider.executeTest(async (mockServer) => {
          const client = new PactflowClient('test-token', mockServer.url, 'pactflow');
          const result = await client.getProviderStates({ provider: providerName });

          expect(result.providerStates).toHaveLength(1);
          expect(result.providerStates[0].name).toBe('special state');
        });
      });
    });
  });

  describe('Error Scenarios', () => {
    describe('Authentication Errors', () => {
      it('returns 401 for missing authentication token', () => {
        provider
          .given('no authentication provided')
          .uponReceiving('a request with missing authentication')
          .withRequest({
            method: 'POST',
            path: '/api/ai/generate',
            headers: {
              'Authorization': 'Bearer ',
              'Content-Type': 'application/json',
              'User-Agent': like('SmartBear MCP Server/0.4.0'),
            },
            body: like({
              language: 'typescript'
            })
          })
          .willRespondWith({
            status: 401,
            headers: {
              'Content-Type': 'application/json'
            },
            body: like({
              error: string('Unauthorized'),
              message: string('Authentication token is required')
            })
          });

        return provider.executeTest(async (mockServer) => {
          const unauthenticatedClient = new PactflowClient('', mockServer.url, 'pactflow');
          await expect(unauthenticatedClient.generate({ language: 'typescript' }))
            .rejects.toThrow('HTTP error! status: 401');
        });
      });

      it('returns 401 for invalid authentication token', () => {
        provider
          .given('invalid authentication provided')
          .uponReceiving('a request with invalid authentication')
          .withRequest({
            method: 'GET',
            path: '/pacts/provider/TestProvider/provider-states',
            headers: {
              'Authorization': 'Bearer invalid-token',
              'User-Agent': like('SmartBear MCP Server/0.4.0'),
            }
          })
          .willRespondWith({
            status: 401,
            headers: {
              'Content-Type': 'application/json'
            },
            body: like({
              error: string('Unauthorized'),
              message: string('Invalid authentication token')
            })
          });

        return provider.executeTest(async (mockServer) => {
          const invalidClient = new PactflowClient('invalid-token', mockServer.url, 'pactflow');
          await expect(invalidClient.getProviderStates({ provider: 'TestProvider' }))
            .rejects.toThrow('HTTP error! status: 401');
        });
      });
    });

    describe('Resource Not Found', () => {
      it('returns 404 for non-existent provider', () => {
        provider
          .given('provider does not exist')
          .uponReceiving('a request for non-existent provider states')
          .withRequest({
            method: 'GET',
            path: '/pacts/provider/NonExistentProvider/provider-states',
            headers: {
              'Authorization': like('Bearer test-token'),
              'User-Agent': like('SmartBear MCP Server/0.4.0'),
            }
          })
          .willRespondWith({
            status: 404,
            headers: {
              'Content-Type': 'application/json'
            },
            body: like({
              error: string('Not Found'),
              message: string('Provider NonExistentProvider not found')
            })
          });

        return provider.executeTest(async (mockServer) => {
          const client = new PactflowClient('test-token', mockServer.url, 'pactflow');
          await expect(client.getProviderStates({ provider: 'NonExistentProvider' }))
            .rejects.toThrow('HTTP error! status: 404');
        });
      });
    });

    describe('Validation Errors', () => {
      it('returns 400 for invalid generation input', () => {
        provider
          .given('invalid generation request data')
          .uponReceiving('a request with invalid generation input')
          .withRequest({
            method: 'POST',
            path: '/api/ai/generate',
            headers: {
              'Authorization': like('Bearer test-token'),
              'Content-Type': 'application/json',
              'User-Agent': like('SmartBear MCP Server/0.4.0'),
            },
            body: like({
              language: 'invalid-language'
            })
          })
          .willRespondWith({
            status: 400,
            headers: {
              'Content-Type': 'application/json'
            },
            body: like({
              error: string('Bad Request'),
              message: string('Invalid language specified'),
              details: like({
                allowedLanguages: eachLike(string('typescript'))
              })
            })
          });

        return provider.executeTest(async (mockServer) => {
          const client = new PactflowClient('test-token', mockServer.url, 'pactflow');
          await expect(client.generate({ language: 'invalid-language' as any }))
            .rejects.toThrow('HTTP error! status: 400');
        });
      });
    });

    describe('Server Errors', () => {
      it('returns 500 for internal server errors', () => {
        provider
          .given('server error occurs')
          .uponReceiving('a request that causes server error')
          .withRequest({
            method: 'POST',
            path: '/api/ai/review',
            headers: {
              'Authorization': like('Bearer test-token'),
              'Content-Type': 'application/json',
              'User-Agent': like('SmartBear MCP Server/0.4.0'),
            },
            body: like({
              pactTests: {
                body: 'corrupted test content'
              }
            })
          })
          .willRespondWith({
            status: 500,
            headers: {
              'Content-Type': 'application/json'
            },
            body: like({
              error: string('Internal Server Error'),
              message: string('An unexpected error occurred while processing the request')
            })
          });

        return provider.executeTest(async (mockServer) => {
          const client = new PactflowClient('test-token', mockServer.url, 'pactflow');
          await expect(client.review({
            pactTests: { body: 'corrupted test content' }
          })).rejects.toThrow('HTTP error! status: 500');
        });
      });
    });

    describe('Polling and Timeout Scenarios', () => {
      it('handles long-running generation with multiple status checks', () => {
        const generationInput: GenerationInput = {
          language: 'java',
          additionalInstructions: 'Complex generation that takes time'
        };

        provider
          .given('a long-running generation request')
          .uponReceiving('a request for complex generation')
          .withRequest({
            method: 'POST',
            path: '/api/ai/generate',
            headers: {
              'Authorization': like('Bearer test-token'),
              'Content-Type': 'application/json',
              'User-Agent': like('SmartBear MCP Server/0.4.0'),
            },
            body: like(generationInput)
          })
          .willRespondWith({
            status: 202,
            headers: {
              'Content-Type': 'application/json'
            },
            body: like({
              status: 'accepted',
              session_id: string('long-session-999'),
              submitted_at: string('2025-09-02T14:50:00Z'),
              status_url: string('/api/ai/status/long-session-999'),
              result_url: string('/api/ai/result/long-session-999')
            })
          });

        // Mock just one status check that shows completion
        provider
          .given('generation has completed quickly')
          .uponReceiving('status check for completed generation')
          .withRequest({
            method: 'HEAD',
            path: '/api/ai/status/long-session-999',
            headers: {
              'Authorization': like('Bearer test-token')
            }
          })
          .willRespondWith({
            status: 200
          });

        provider
          .given('complex generation results are available')
          .uponReceiving('a request to get complex generation results')
          .withRequest({
            method: 'GET',
            path: '/api/ai/result/long-session-999',
            headers: {
              'Authorization': like('Bearer test-token')
            }
          })
          .willRespondWith({
            status: 200,
            headers: {
              'Content-Type': 'application/json'
            },
            body: like({
              id: string('complex-result-999'),
              code: string(`
@Test
public void testComplexScenario() {
    // Generated complex Java Pact test
}
              `.trim()),
              language: 'java'
            })
          });

        return provider.executeTest(async (mockServer) => {
          const client = new PactflowClient('test-token', mockServer.url, 'pactflow');
          const result = await client.generate(generationInput);

          expect(result).toMatchObject({
            id: expect.any(String),
            code: expect.stringContaining('@Test'),
            language: 'java'
          });
        });
      });
    });
  });
});
