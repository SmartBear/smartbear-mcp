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

- Availability: Cloud
- **Use Cases:**
  - Create new Pact tests for a project from your IDE.
  - Update Pact tests when your API client changes from your IDE.
  - Integrate with agents like GitHub Copilot or Claude Code to automatically create and maintain contract tests.

### Fetch Provider States

- Purpose: Retrieve the states of a specific provider.
- Availability: Cloud, On-Premises, Pact Broker
- **Use Cases:**
  - Reuse existing states when creating new Pact tests to streamline cross team collaboration.
  - Generate boilerplate code (state handlers) for your provider tests.
  - Gain a deeper understanding of consumer needs.

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

- Availability: Cloud
- **Use Cases:**
  - Review existing Pact tests for alignment with the latest contract testing best practices.
  - Particularly useful when reviewing older tests, as teams generally get better at writing pact tests over time.

### Can I Deploy

- Purpose: Determine whether a specific version of a pacticipant can be safely deployed into a given environment.
- Parameters:
  - **`pacticipant`**: The name of the service (pacticipant).
  - **`version`**: The version of the pacticipant being evaluated for deployment.
  - **`environment`**: The target environment (e.g., staging, production).
- Availability: Cloud, On-Premises, Pact Broker
- **Use Cases:**
  - Support informed deployment decisions by answering "can I deploy version X of this service to Y environment?".
  - Quickly understand if an application is mergeable to avoid breaking other applications in pre-production environments.
  - Diagnose what's require to bring the system into a mergeable or deployable state.

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

- Availability: Cloud, On-Premises, Pact Broker
- **Use Cases:**
  - Quickly identify which consumer and provider version combinations have passed or failed verification.
  - Diagnose and investigate why a particular consumer-provider verification failed.
  - Visualize the overall contract compatibility across services.
  - Perform advanced queries using selectors to understand compatibility within specific branches or environments.
  - Support informed deployment decisions by answering "can I deploy version X of this service to production?".

### PactFlow AI Status

- Purpose: Retrieve the status of AI features for the PactFlow workspace, including whether AI features are enabled, the number of remaining and consumed AI credits, and user-level permissions issues preventing usage.
- Availability: Cloud

### Metrics

#### All

- Purpose: Fetch metrics across the workspace. Use this to get an overview of contract testing usage, resource consumption and account-wide statistics.
- Availability: Cloud, On-Premises, Pact Broker

#### Team

- Purpose: Fetch metrics for all teams within PactFlow. Use this to get an overview of team-specific contract testing usage, resource consumption and usage statistics.
- Availability: Cloud
- **Use Cases:**
  - Understand usage and activity on Contract Testing workspace.
  - Monitor and stimulate team-level adoption (e.g. through leaderboards and gamification).
  - Connect the data to your observability tools such as grafana, splunk or ELK stack.
  - Create widgets for use in ChatGPT [OpenAI Apps SDK Quickstart](https://developers.openai.com/apps-sdk/quickstart/).

### Pacticipants

#### List Pacticipants

- Purpose: Retrieve all pacticipants (applications/services) registered in the workspace.
- Parameters:
  - **`pageNumber`** (optional): Page number (default: 1)
  - **`pageSize`** (optional): Number of results per page
- Availability: Cloud, On-Premises, Pact Broker
- **Use Cases:**
  - Discover all applications participating in contract testing.
  - Audit registered services and check their main branches or repository URLs.

#### Get Pacticipant

- Purpose: Retrieve metadata for a specific pacticipant by name.
- Parameters:
  - **`pacticipantName`** (required): Name of the pacticipant
- Availability: Cloud, On-Premises, Pact Broker
- **Use Cases:**
  - Inspect a service's display name, main branch, and repository URL.
  - Verify a pacticipant exists before performing other operations against it.

#### Update Pacticipant

- Purpose: Fully replace a pacticipant's metadata. All fields not provided are cleared.
- Parameters:
  - **`pacticipantName`** (required): Name of the pacticipant to update
  - **`displayName`** (optional): Human-readable display name
  - **`mainBranch`** (optional): Name of the main/trunk branch (e.g. `main`)
  - **`repositoryName`** (optional): Repository name
  - **`repositoryNamespace`** (optional): Repository namespace/organisation
  - **`repositoryUrl`** (optional): URL of the source repository
- Availability: Cloud, On-Premises, Pact Broker
- **Use Cases:**
  - Set or correct a service's main branch to enable branch-based can-i-deploy checks.
  - Update repository metadata to keep the workspace accurate.

#### Patch Pacticipant

- Purpose: Partially update a pacticipant's metadata — only the fields provided are changed.
- Parameters: Same as **Update Pacticipant**
- Availability: Cloud, On-Premises, Pact Broker
- **Use Cases:**
  - Update a single field (e.g. `mainBranch`) without affecting other metadata.
  - Preferred over **Update Pacticipant** when making targeted changes.

### Branches & Versions

#### List Branches

- Purpose: Retrieve all branches for a given pacticipant, with optional filtering and pagination.
- Parameters:
  - **`pacticipantName`** (required): Name of the pacticipant
  - **`q`** (optional): Filter branches by name
  - **`pageNumber`** (optional): Page number
  - **`pageSize`** (optional): Results per page
- Availability: Cloud, On-Premises, Pact Broker
- **Use Cases:**
  - Explore active development lines of a service.
  - Identify stale branches to clean up.

#### Get Branch Versions

- Purpose: Retrieve all versions published from a specific branch of a pacticipant.
- Parameters:
  - **`pacticipantName`** (required): Name of the pacticipant
  - **`branchName`** (required): Name of the branch
  - **`pageNumber`** (optional): Page number
  - **`pageSize`** (optional): Results per page
- Availability: Cloud, On-Premises, Pact Broker
- **Use Cases:**
  - Trace which versions were created on a feature branch before it was merged.
  - Understand the history of a branch for auditing or debugging purposes.

#### List Pacticipant Versions

- Purpose: Retrieve all published versions for a given pacticipant.
- Parameters:
  - **`pacticipantName`** (required): Name of the pacticipant
  - **`pageNumber`** (optional): Page number
  - **`pageSize`** (optional): Results per page
- Availability: Cloud, On-Premises, Pact Broker
- **Use Cases:**
  - List all published versions of a service with their branch and tag associations.
  - Trace deployment history.

#### Get Pacticipant Version

- Purpose: Retrieve metadata for a specific version of a pacticipant.
- Parameters:
  - **`pacticipantName`** (required): Name of the pacticipant
  - **`versionNumber`** (required): Version number to retrieve
- Availability: Cloud, On-Premises, Pact Broker
- **Use Cases:**
  - Inspect the branches, tags, and build URL for a specific release.

#### Get Latest Pacticipant Version

- Purpose: Retrieve the latest version of a pacticipant, optionally filtered by tag.
- Parameters:
  - **`pacticipantName`** (required): Name of the pacticipant
  - **`tag`** (optional): Tag to filter by (e.g. `prod`). If omitted, returns the overall latest version.
- Availability: Cloud, On-Premises, Pact Broker
- **Use Cases:**
  - Quickly identify the most recent version of a service in production.
  - Find the latest tagged release for a given environment.

#### Update Pacticipant Version

- Purpose: Update metadata for a specific pacticipant version (e.g. set the build URL).
- Parameters:
  - **`pacticipantName`** (required): Name of the pacticipant
  - **`versionNumber`** (required): Version number to update
  - **`buildUrl`** (optional): URL of the CI build that produced this version
- Availability: Cloud, On-Premises, Pact Broker
- **Use Cases:**
  - Set the build URL for a version when it was not available at publish time.

### Environments & Deployments

#### List Environments

- Purpose: Retrieve all environments configured in the workspace.
- Availability: Cloud, On-Premises, Pact Broker
- **Use Cases:**
  - Discover environment UUIDs needed for record-deployment and can-i-deploy operations.
  - Audit the configured deployment environments.

#### Get Environment

- Purpose: Retrieve metadata for a specific environment by UUID.
- Parameters:
  - **`environmentId`** (required): UUID of the environment
- Availability: Cloud, On-Premises, Pact Broker
- **Use Cases:**
  - Confirm environment details such as display name and production flag before recording a deployment.

#### Record Deployment

- Purpose: Record that a specific version of a pacticipant has been deployed to an environment.
- Parameters:
  - **`pacticipantName`** (required): Name of the pacticipant that was deployed
  - **`versionNumber`** (required): Version number that was deployed
  - **`environmentId`** (required): UUID of the target environment
  - **`applicationInstance`** (optional): Identifies a specific instance when multiple instances of the same application are deployed to the same environment (e.g. `blue`, `green`)
- Availability: Cloud, On-Premises, Pact Broker
- **Use Cases:**
  - Keep PactFlow's deployment state accurate after each successful deploy.
  - Enable can-i-deploy checks and contract verification to use real deployment data.
  - Support blue/green deployment tracking with `applicationInstance`.

#### Get Currently Deployed Versions

- Purpose: Retrieve all versions currently deployed to a given environment.
- Parameters:
  - **`environmentId`** (required): UUID of the environment
- Availability: Cloud, On-Premises, Pact Broker
- **Use Cases:**
  - Audit which service versions are live in an environment.
  - Troubleshoot deployment issues by inspecting the current state of an environment.

#### Get Deployed Versions for Version

- Purpose: Retrieve deployment records for a specific pacticipant version in a specific environment.
- Parameters:
  - **`pacticipantName`** (required): Name of the pacticipant
  - **`versionNumber`** (required): Version number
  - **`environmentId`** (required): UUID of the environment
- Availability: Cloud, On-Premises, Pact Broker
- **Use Cases:**
  - Check whether a specific version is currently deployed to a given environment.
  - Review the full deployment history for a version.

#### Record Release

- Purpose: Record that a version of a pacticipant has been released to an environment (for mobile/library release workflows).
- Parameters:
  - **`pacticipantName`** (required): Name of the pacticipant that was released
  - **`versionNumber`** (required): Version number that was released
  - **`environmentId`** (required): UUID of the target environment
- Availability: Cloud, On-Premises, Pact Broker
- **Use Cases:**
  - Track mobile app or library releases where multiple versions coexist simultaneously.
  - Unlike record-deployment (which supersedes previous versions), record-release marks a version as currently supported without replacing prior versions.

#### Get Currently Supported Versions

- Purpose: Retrieve all versions currently released and supported in a given environment.
- Parameters:
  - **`environmentId`** (required): UUID of the environment
- Availability: Cloud, On-Premises, Pact Broker
- **Use Cases:**
  - Check which mobile app or library versions are still actively in use.
  - Understand the range of versions that need to remain contract-compatible.

#### Get Released Versions for Version

- Purpose: Retrieve release records for a specific pacticipant version in a specific environment.
- Parameters:
  - **`pacticipantName`** (required): Name of the pacticipant
  - **`versionNumber`** (required): Version number
  - **`environmentId`** (required): UUID of the environment
- Availability: Cloud, On-Premises, Pact Broker
- **Use Cases:**
  - Review the full release history for a version in mobile/library workflows.

### Contracts

#### Publish Consumer Contracts

- Purpose: Publish one or more consumer Pact contracts to the Pact Broker or PactFlow, with branch and tag metadata.
- Parameters:
  - **`pacticipantName`** (required): Name of the consumer application
  - **`pacticipantVersionNumber`** (required): Version number of the consumer
  - **`contracts`** (required): Array of contract objects, each containing:
    - **`consumerName`**: Consumer application name
    - **`providerName`**: Provider application name
    - **`content`**: Base64-encoded Pact JSON content
    - **`contentType`**: Must be `application/json`
    - **`specification`**: Must be `pact`
  - **`branch`** (optional): Branch name of the consumer
  - **`tags`** (optional): Version tags (e.g. `main`, `staging`)
  - **`buildUrl`** (optional): URL of the CI build that produced these contracts
- Availability: Cloud, On-Premises, Pact Broker
- **Use Cases:**
  - Upload consumer-driven contract files after running consumer tests.
  - Associate contracts with a branch so PactFlow can match them to provider verification results.

#### Publish Provider Contract

- Purpose: Publish a provider OpenAPI contract and self-verification results to PactFlow for Bi-Directional Contract Testing.
- Parameters:
  - **`providerName`** (required): Name of the provider application
  - **`pacticipantVersionNumber`** (required): Version number of the provider
  - **`contract`** (required): Object containing:
    - **`content`**: Base64-encoded OpenAPI specification
    - **`contentType`**: `application/json`, `application/yaml`, or `application/yml`
    - **`specification`**: Must be `oas`
    - **`selfVerificationResults`**: Results of verifying the provider against its own spec, including `success` (boolean), `verifier` (tool name, e.g. `dredd`), and optional content/format fields
  - **`branch`** (optional): Branch name of the provider
  - **`tags`** (optional): Version tags
  - **`buildUrl`** (optional): URL of the CI build
- Availability: Cloud
- **Use Cases:**
  - Upload an OpenAPI spec as the provider contract along with tool-based verification results.
  - Enable PactFlow to perform automated cross-contract verification without running consumer pact tests directly on the provider.

#### Get Pacts for Verification

- Purpose: Retrieve the pacts that a provider should verify in its current CI run.
- Parameters:
  - **`providerName`** (required): Name of the provider
  - **`consumerVersionSelectors`** (optional): Array of selectors controlling which consumer versions to include (by branch, environment, deployment status, etc.)
  - **`includePendingStatus`** (optional): Include pending status in results
  - **`includeWipPactsSince`** (optional): Include WIP pacts published since this date (ISO 8601)
  - **`providerVersionBranch`** (optional): Branch of the provider version being verified
  - **`providerVersionTags`** (optional): Tags for the provider version being verified
- Availability: Cloud, On-Premises, Pact Broker
- **Use Cases:**
  - Fetch the exact set of consumer pacts to verify in a CI run.
  - Use WIP pacts to get early feedback on new consumer interactions without breaking the provider build.

### Bi-Directional Contract Testing (BDCT)

These tools provide access to BDCT artefacts and verification results. All BDCT tools are available on **Cloud** only.

#### Get BDCT Provider Contract

- Purpose: Fetch the provider OpenAPI contract for a given provider version.
- Parameters:
  - **`providerName`** (required): Name of the provider
  - **`providerVersionNumber`** (required): Provider version number
- Availability: Cloud

#### Get BDCT Provider Contract Verification Results

- Purpose: Fetch the self-verification results for a provider contract version (the outcome of running a tool such as Dredd or Schemathesis against the provider's own OpenAPI spec).
- Parameters:
  - **`providerName`** (required): Name of the provider
  - **`providerVersionNumber`** (required): Provider version number
- Availability: Cloud

#### Get BDCT Consumer Contracts

- Purpose: Fetch all consumer Pact contracts that PactFlow compared against the provider's OpenAPI spec for a specific provider version.
- Parameters:
  - **`providerName`** (required): Name of the provider
  - **`providerVersionNumber`** (required): Provider version number
- Availability: Cloud

#### Get BDCT Consumer Contract Verification Results

- Purpose: Fetch the results of comparing all consumer Pact contracts against the provider's OpenAPI spec for a specific provider version.
- Parameters:
  - **`providerName`** (required): Name of the provider
  - **`providerVersionNumber`** (required): Provider version number
- Availability: Cloud

#### Get BDCT Cross-Contract Verification Results

- Purpose: Fetch the combined cross-contract comparison results for a specific provider version — the key result that determines whether can-i-deploy will pass.
- Parameters:
  - **`providerName`** (required): Name of the provider
  - **`providerVersionNumber`** (required): Provider version number
- Availability: Cloud

#### Get BDCT Consumer Contract by Consumer Version

- Purpose: Fetch the consumer Pact contract for a specific consumer-provider version pair.
- Parameters:
  - **`providerName`** (required): Name of the provider
  - **`providerVersionNumber`** (required): Provider version number
  - **`consumerName`** (required): Name of the consumer
  - **`consumerVersionNumber`** (required): Consumer version number
- Availability: Cloud

#### Get BDCT Provider Contract by Consumer Version

- Purpose: Fetch the provider OpenAPI contract in the context of a specific consumer-provider version pair.
- Parameters: Same as **Get BDCT Consumer Contract by Consumer Version**
- Availability: Cloud

#### Get BDCT Provider Contract Verification Results by Consumer Version

- Purpose: Fetch the provider self-verification results for a specific consumer-provider version pair.
- Parameters: Same as **Get BDCT Consumer Contract by Consumer Version**
- Availability: Cloud

#### Get BDCT Consumer Contract Verification Results by Consumer Version

- Purpose: Fetch the results of comparing a specific consumer version's Pact against the provider's OpenAPI spec.
- Parameters: Same as **Get BDCT Consumer Contract by Consumer Version**
- Availability: Cloud

#### Get BDCT Cross-Contract Verification Results by Consumer Version

- Purpose: Fetch the precise cross-contract comparison outcome between a specific consumer version and provider version. Use this to understand exactly why a specific consumer-provider pairing succeeded or failed.
- Parameters: Same as **Get BDCT Consumer Contract by Consumer Version**
- Availability: Cloud

- **Use Cases (BDCT tools):**
  - Investigate why a provider version failed cross-contract verification.
  - Retrieve the exact consumer contract that triggered a BDCT failure for a given provider version.
  - Compare provider spec and consumer pact side-by-side to diagnose incompatibilities.

### Integrations & Network

#### List Integrations

- Purpose: Retrieve all consumer-provider integrations registered in the workspace.
- Availability: Cloud, On-Premises, Pact Broker
- **Use Cases:**
  - Get a high-level view of all consumer-provider pairings that have pacts published.
  - Audit the full integration landscape of the workspace.

#### Get Pacticipant Network

- Purpose: Retrieve the integration network graph for a specific pacticipant.
- Parameters:
  - **`pacticipantName`** (required): Name of the pacticipant
- Availability: Cloud, On-Premises, Pact Broker
- **Use Cases:**
  - Visualise all the services a pacticipant consumes and all consumers that depend on it.
  - Understand the blast radius of changes to a service before deploying.

### Labels

#### List Labels

- Purpose: Retrieve all labels used across the workspace.
- Parameters:
  - **`pageNumber`** (optional): Page number
  - **`pageSize`** (optional): Results per page
- Availability: Cloud, On-Premises, Pact Broker
- **Use Cases:**
  - Discover all label categories in use across the workspace.

#### Get Pacticipant Label

- Purpose: Check whether a specific label is applied to a pacticipant.
- Parameters:
  - **`pacticipantName`** (required): Name of the pacticipant
  - **`labelName`** (required): Name of the label
- Availability: Cloud, On-Premises, Pact Broker
- **Use Cases:**
  - Verify that a label exists on a pacticipant (returns 404 if not applied).

#### List Pacticipants by Label

- Purpose: Retrieve all pacticipants that have a specific label applied.
- Parameters:
  - **`labelName`** (required): Label name to filter by
- Availability: Cloud, On-Premises, Pact Broker
- **Use Cases:**
  - Filter services by team ownership, technology, or any custom grouping applied via labels.
  - Query all services belonging to a particular team label.

## Configuration Notes

- **Required Environment Variables**: `PACT_BROKER_BASE_URL` is required for all operations.
- **Project Scoping**: When `PACT_BROKER_USERNAME` and `PACT_BROKER_PASSWORD` is configured:
  - The Fetch provider states tool gets enabled.
