![api-hub.png](./images/embedded/api-hub.png)

The PactFlow Contract testing client provides comprehensive tools which makes testing and deploying microservices at scale, simple and worry free for thousands of developers and testers around the world. Tools for PactFlow requires a `PACT_BROKER_BASE_URL` along with either a `PACT_BROKER_TOKEN` or (`PACT_BROKER_USERNAME` and `PACT_BROKER_PASSWORD`).
Read more on PactFlow [Docs](https://docs.pactflow.io/).

## Available Tools

### Generate Pact Tests(`generate`)

- Purpose: Generate Pact tests using an OpenAPI spec in 6 different languages.
- Returns: Generated Pact test
- Parameters:

| Parameter |               | Description | Type | Required |
| --- | --- | --- | --- | --- |
| `language` | | The target language in which the Pact tests should be generated. If absent, the language will be inferred from other inputs, such as any provided code files. This field is optional if and only if it can be inferred from other inputs. | String | No |
| `request_response` | | Request/response pair for the interaction. | Object | No |
| `request_response` | `request` | The request portion of the interaction. The format is very flexible, and can be a simple HTTP/1.1 payload, a portion of a Gherkin scenario, or any other text format which describes the request. A single file provided as input to the code generator. | File | Yes |
| `request_response` | `response` | The response portion of the interaction. As with the request, the format is very flexible. A single file provided as input to the code generator. | File | Yes |
| `code` | | Any collection of code files which contain information which is relevant to the Pact generation process. This could include client code, data models, and other utilities | List of Files | No |
| `openapi` | | If provided, the OpenAPI document(local/remote) which describes the API being tested and is accompanied by a matcher which will be used to identify the interactions in the OpenAPI document which are relevant to the Pact generation process. | Object | No |
| `openapi` | `document` | The OpenAPI document which describes the API being tested. The OpenAPI document will be used to identify the interactions and generate the appropriate Pact tests. | Object | No |
| `openapi` | `matcher` | The matcher which will be used to identify the interactions in the OpenAPI document. As OpenAPI documents can be quite large and may contain many redundant interactions, this matcher should be used to filter out the endpoint, method, and status code which are relevant to the Pact generation process. | Object | Yes |
| `openapi` | `remoteDocument` | Contains Auth-Token, URL and Auth-Scheme of a remote location where an OpenAPI document is located. | Object | No |
| `additional_instructions` | | If provided, this field allows specifying extra guidelines or configurations. This can be useful for handling special cases, overriding default behaviors,or adding constraints to the existing generation logic. | String | No |
| `test_template` | | If provided, this field allows the system to use the provided template as a basis for the generated Pact tests. This can be useful for ensuring that the generated tests follow a specific structure, format, framework, and best practices. | File | No |

### Fetch Provider States

- Purpose: Retrieve the states of a specific provider.

### Review Pact Tests(`review`)

- Purpose: Review Pact tests and provide a list of recommendations that can be applied.
- Returns: List of recommendations
- Parameters:

| Parameter |               | Description | Type | Required |
| --- | --- | --- | --- | --- |
| `pact_tests` | | Primary pact tests that needs to be reviewed. | File | Yes |
| `code` | | Any collection of code files which contain information which is relevant to the Pact generation process. This could include client code, data models, and other utilities | List of Files | No |
| `user_instructions` | | Optional free-form instructions that provide additional context or specify areas of focus during the refinement process of the Pact test. | String | No |
| `error_messages` | | Optional error output from failed contract test runs. These can be used to better understand the context or failures observed and guide the recommendations toward resolving specific issues. | List of Strings | No |
| `openapi` | | If provided, the OpenAPI document(local/remote) which describes the API being tested and is accompanied by a matcher which will be used to identify the interactions in the OpenAPI document which are relevant to the Pact generation process. | Object | No |
| `openapi` | `document` | The OpenAPI document which describes the API being tested. The OpenAPI document will be used to identify the interactions and generate the appropriate Pact tests. | Object | No |
| `openapi` | `matcher` | The matcher which will be used to identify the interactions in the OpenAPI document. As OpenAPI documents can be quite large and may contain many redundant interactions, this matcher should be used to filter out the endpoint, method, and status code which are relevant to the Pact generation process. | Object | Yes |
| `openapi` | `remoteDocument` | Contains Auth-Token, URL and Auth-Scheme of a remote location where an OpenAPI document is located. | Object | No |

### Can I Deploy

- Purpose: Determine whether a specific version of a pacticipant can be safely deployed into a given environment.

## Configuration Notes

- **Required Environment Variables**: `PACT_BROKER_BASE_URL` is required for all operations.
- **Project Scoping**: When `PACT_BROKER_USERNAME` and `PACT_BROKER_PASSWORD` is configured:
  - The Fetch provider states tool gets enabled.
