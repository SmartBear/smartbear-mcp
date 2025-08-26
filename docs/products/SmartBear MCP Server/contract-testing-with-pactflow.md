![api-hub.png](./images/embedded/api-hub.png)

The PactFlow Contract testing client provides comprehensive tools which makes testing and deploying microservices at scale, simple and worry free for thousands of developers and testers around the world.. Tools for PactFlow requires a `PACT_BROKER_BASE_URL` along with either a `PACT_BROKER_TOKEN` or (`PACT_BROKER_USERNAME` and `PACT_BROKER_PASSWORD`).


## Available Tools

### Generate Pact Tests

- Generate Pact tests using an OpenAPI spec in 6 different languages.

### Fetch Provider States

- Retrieve the states of a specific provider

### Review Pact Tests

- Review Pact tests and provide a list of recommendations that can be applied.

## Configuration Notes

- **Required Environment Variables**: `PACT_BROKER_BASE_URL` is required for all operations.
- **Project Scoping**: When `PACT_BROKER_USERNAME` and `PACT_BROKER_PASSWORD` is configured:
  - The Fetch provider states tool gets enabled.
