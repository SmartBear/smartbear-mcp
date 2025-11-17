![contract-testing.png](./images/embedded/contract-testing.png)

The PactFlow Contract testing client provides comprehensive tools which makes testing and deploying microservices at scale, simple and worry free for thousands of developers and testers around the world. Tools for PactFlow requires a `PACT_BROKER_BASE_URL` along with either a `PACT_BROKER_TOKEN` or (`PACT_BROKER_USERNAME` and `PACT_BROKER_PASSWORD`).

Read more on PactFlow [Docs](https://docs.pactflow.io/).

## Available Tools

### Generate Pact Tests

- Purpose: Generate Pact tests from a number of inputs.
- Returns: Generated Pact test
- Parameters:
  - **`language`** (optional)

    The target language in which the Pact tests should be generated. If absent, the language will be inferred from other inputs, such as any provided code files. This field is optional if and only if it can be inferred from other inputs
  - **`request_response`** (optional)

    Request/response pair for the interaction.
    - **`request`**

      The request portion of the interaction. The format is very flexible, and can be a simple HTTP/1.1 payload, a portion of a Gherkin scenario, or any other text format which describes the request. A single file provided as input to the code generator.
    - **`response`**

      The response portion of the interaction. As with the request, the format is very flexible. A single file provided as input to the code generator.
  - **`code`** (optional)

    Any collection of code files which contain information which is relevant to the Pact generation process. This could include client code, data models, and other utilities
  - **`openapi`** (optional)

    If provided, the OpenAPI document(local/remote) which describes the API being tested and is accompanied by a matcher which will be used to identify the interactions in the OpenAPI document which are relevant to the Pact generation process.
    - **`document`** (optional)

      The OpenAPI document which describes the API being tested. The OpenAPI document will be used to identify the interactions and generate the appropriate Pact tests.
    - **`matcher`**

      The matcher which will be used to identify the interactions in the OpenAPI document. As OpenAPI documents can be quite large and may contain many redundant interactions, this matcher should be used to filter out the endpoint, method, and status code which are relevant to the Pact generation process.
    - **`remoteDocument`** (optional)

      Contains Auth-Token, URL and Auth-Scheme of a remote location where an OpenAPI document is located.
  - **`additional_instructions`** (optional)

    If provided, this field allows specifying extra guidelines or configurations. This can be useful for handling special cases, overriding default behaviors,or adding constraints to the existing generation logic.
  - **`test_template`** (optional)

    If provided, this field allows the system to use the provided template as a basis for the generated Pact tests. This can be useful for ensuring that the generated tests follow a specific structure, format, framework, and best practices.

### Fetch Provider States

- Purpose: Retrieve the states of a specific provider.

### Review Pact Tests

- Purpose: Review Pact tests and provide a list of recommendations that can be applied.
- Returns: List of recommendations
- Parameters:
  - **`pact_tests`**

    Primary pact tests that needs to be reviewed.
  - **`code`** (optional)

    Any collection of code files which contain information which is relevant to the Pact generation process. This could include client code, data models, and other utilities
  - **`openapi`** (optional)

    If provided, the OpenAPI document(local/remote) which describes the API being tested and is accompanied by a matcher which will be used to identify the interactions in the OpenAPI document which are relevant to the Pact generation process.
    - **`document`** (optional)

      The OpenAPI document which describes the API being tested. The OpenAPI document will be used to identify the interactions and generate the appropriate Pact tests.
    - **`matcher`**

      The matcher which will be used to identify the interactions in the OpenAPI document. As OpenAPI documents can be quite large and may contain many redundant interactions, this matcher should be used to filter out the endpoint, method, and status code which are relevant to the Pact generation process.
    - **`remoteDocument`** (optional)

      Contains Auth-Token, URL and Auth-Scheme of a remote location where an OpenAPI document is located.
  - **`user_instructions`** (optional)

    Optional free-form instructions that provide additional context or specify areas of focus during the refinement process of the Pact test.
  - **`error_messages`** (optional)

    Optional error output from failed contract test runs. These can be used to better understand the context or failures observed and guide the recommendations toward resolving specific issues.

### Can I Deploy

- Purpose: Determine whether a specific version of a pacticipant can be safely deployed into a given environment.
- Parameters:
  - **`pacticipant`**
  The name of the service (pacticipant).
  - **`version`**
  The version of the pacticipant being evaluated for deployment.
  - **`environment`**
  The target environment (e.g., staging, production).

### Matrix

- Purpose: Retrieve the comprehensive contract verification matrix that shows the relationship between consumer and provider versions, their associated pact files, and verification results.
- Returns: Matrix response containing verification matrix, notices, and summary
- Parameters:
  - **`q`** (required)

    Array of pacticipant selectors (minimum 1, maximum 2 selectors). Each selector contains:
    - **`pacticipant`** (required): Name of the pacticipant (application)
    - **`version`** (optional): Version number
    - **`branch`** (optional): Name of the pacticipant version branch
    - **`environment`** (optional): The name of the environment that the pacticipant version is deployed to
    - **`latest`** (optional): Whether the selector describes the latest version from a branch/with a tag/for a pacticipant
    - **`tag`** (optional): The name of the pacticipant version tag (superseded by branch and environments)
    - **`mainBranch`** (optional): Whether the version(s) are from the main branch of the pacticipant
  - **`latestby`** (optional)

    Removes rows for overridden pacts/verifications from results:
    - `cvp`: Show only the latest row for each consumer version and provider
    - `cvpv`: Show only the latest row for each consumer version and provider version
  - **`limit`** (optional)

    The limit on the number of results to return (1-1000, default: 100)

- **Use Cases:**
  - Quickly identify which consumer and provider version combinations have passed or failed verification
  - Diagnose and investigate why a particular consumer-provider verification failed
  - Visualize the overall contract compatibility across services
  - Perform advanced queries using selectors to understand compatibility within specific branches or environments
  - Support informed deployment decisions by answering "can I deploy version X of this service to production?"

### PactFlow AI Status

- Purpose: Retrieve the status of AI features for the PactFlow workspace, including whether AI features are enabled, the number of remaining and consumed AI credits, and user-level permissions issues preventing usage.

## Configuration Notes

- **Required Environment Variables**: `PACT_BROKER_BASE_URL` is required for all operations.
- **Project Scoping**: When `PACT_BROKER_USERNAME` and `PACT_BROKER_PASSWORD` is configured:
  - The Fetch provider states tool gets enabled.
