# Contributing

Thank you for your contributing to SmartBear MCP!

- [Contributing](#contributing)
  - [Getting Started](#getting-started)
    - [Repository Structure](#repository-structure)
    - [Branching Strategy](#branching-strategy)
  - [Development Setup](#development-setup)
  - [Making Changes](#making-changes)
  - [Testing Guidelines](#testing-guidelines)
    - [Test Requirements](#test-requirements)
    - [Running Tests](#running-tests)
  - [Usage Analytics (remote server)](#usage-analytics-remote-server)
  - [Documentation](#documentation)
    - [Previewing docs](#previewing-docs)
  - [Releases](#releases)
  - [Additional Resources](#additional-resources)

## Getting Started

### Repository Structure

```
├── src/<product-name>/      # Specific SmartBear product integration
├── src/common/              # Shared utilities and types
├── src/tests/               # Test files
├── docs/                    # Documentation for developer.smartbear.com site
└── scripts/                 # Build and utility scripts
```

### Branching Strategy

The repository uses `main` as the sole primary development and release branch.

Please read the following guidance:

- Feature branches should be created from `main` and PRs made into `main`
- Create `integration/` branches from `main` if you want to keep a larger change away from the release during development
- If your change is noteworthy to our customers, update the [CHANGELOG.md](./CHANGELOG.md) in your PR with details of your changes
  - You may need to create a new section if your change is the first since the last release
- This is a public repo, so a squash-commit of your feature PRs is strongly encouraged to give a cleaner history
- Don't forget to update the `docs/` directory with any noteworthy changes to functionality or configuration

## Development Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/SmartBear/smartbear-mcp.git
   cd smartbear-mcp
   ```

2. **Install Dependencies**

  Make sure you have a current version of Node.js and then run:

   ```bash
   npm install
   ```

   We also recommend installing [`prek`](https://prek.j178.dev/) git hooks to automatically run linting and formatting checks before each commit:

   ```bash
   prek install
   ```

3. **Verify Setup**
   ```bash
   npm run build
   npm run lint
   npm run format:check
   npm run test:run
   ```

## Making Changes

To build the files for local testing, run:

```bash
npm run build
```

You can then add the `dist` directory as an MCP server in your IDE.

For example, in VS Code, use the following configuration with debugging enabled so that you can step through your code:

```json
{
  "servers": {
    "smartbear": {
    "type": "stdio",
    "command": "node",
    "dev": {                            // <-- To allow debugging in VS Code
      "watch": "dist/**/*.js",
      "debug": {
          "type": "node"
      },
    },
    "args": ["<PATH_TO_SMARTBEAR_MCP_REPO>/dist/index.js"],
    "env": {
        // ...
      }
    }
    // ...
  },
}
```

You can also use the [MCP Inspector](https://github.com/modelcontextprotocol/inspector) web interface, first setting the appropriate environment variables for the products you want to test:

```bash
npx @modelcontextprotocol/inspector node dist/index.js
```

## Testing Guidelines

### Test Requirements

- All new features must include tests
- Please always maintain or improve test coverage
- Mock external dependencies appropriately

### Running Tests

```bash
# Run all tests
npm run test:run

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Usage Analytics (remote server)

In HTTP mode, with `MCP_SERVER_AMPLITUDE_API_KEY` set, the server reports `Server Initialized`, `Session Started`, `Session Ended`, `Tool Called` and `Tools Listed` events to the shared SmartBear Amplitude project (see `src/common/analytics.ts`). Every event carries `app_name`, `organization`, `analytics_id`, `source` and `user_agent`. All logic lives in the shared module; a product only declares, on its `Client`, where things live in its OAuth bearer JWT:

```ts
analytics = { appName: "BugSnag", userId: ["sub"] };
```

- `appName` — the product's `app_name`, registered in the shared Amplitude project (currently: Platform, Portal, Test, Explore, Design, Contract Test, BugSnag). Leave it unset until registered; the server then omits it.
- `userId` — claim paths holding a stable user id, tried in order. Dot paths (`context.user.accountId`) and numeric claims work.
- `organizationId` — claim paths holding the organization id, optional.
- `tokenHeader` — the request header carrying the product's credential, for products that receive it in their own header instead of `Authorization`. See below.

### Products whose token is not in `Authorization`

By default the shared module reads claims from the request's `Authorization: Bearer` token. A product that receives its credential in a product-specific header instead declares that header, and identity then resolves the same way as for any other product:

```ts
analytics = { appName: "Acme", tokenHeader: "Product-Api-Token", userId: ["sub"] };
```

- The declared header is tried **first**; `Authorization` remains the fallback, so a deployment using either still works.
- Whichever candidate **decodes as a JWT first** wins. An opaque API key sitting in the product header therefore never masks a usable OAuth token in `Authorization`.
- A `Bearer ` prefix is stripped from either header, and a repeated header uses its first value.
- Declaring `Authorization` (in any casing) is harmless — the header is not read twice.

The credential must be a **JWT** for this to produce identity. An opaque API key or personal access token has no claims to read, so the product stays anonymous (`analytics_id` omitted) no matter which header it arrives in — the events are still sent, just without a user. Identity also still requires the usual claims: an `email` claim identifies the caller with no further declaration, otherwise a `userId` claim path must be declared, and a claim that was not declared is never used.

`analytics_id` is always computed centrally: `sha256(email.toLowerCase())` when the token has an `email` claim (matches SmartBear ID, so it joins with other SmartBear systems), otherwise `sha256("<integration>:<user id>")` from the declared claim (unique within MCP only). Whatever is missing is omitted from the event; nothing is guessed. Raw emails, ids, credentials, tool arguments and results are never sent.

## Documentation

Documentation lives in the `/docs` directory of this repo. Changes to the documentation will be automatically deployed to the docs site when a release is published and to a SmartBear-internal staging site when merged to `main`. For full information on the markdown syntax allowed in these docs, please see the [SwaggerHub Portal Management](https://github.com/frankkilcommins/SwaggerHub-Portal-Management) docs.

### Previewing docs

SmartBear team members wishing to preview docs changes in the internal site before a change is merged to `main`, run the "Publish Portal Content" GitHub Action manually from the "Actions" tab in this repository, selecting your branch as the workflow input.

Please note – there is only one preview site, shared with `main` merges.

## Releases

A release will be carried out by a member of the SmartBear team when a set of releasable changes is ready on the `main` branch. If there are commits from more than one product, the releasing engineer will coordinate with each product team to ensure the release is appropriate and sufficiently documented in the changelog/docs. The release engineer will ideally wait up to one working day for feedback or agreement from the other product teams before proceeding with the release.

Please follow these steps to create a new release:

1. **Run `npm run bump`** to:
   - Suggest a version number based on [semantic versioning](https://semver.org/)
   - Create a release branch from `main`
   - Update the version in `package.json` , `package-lock.json` and `CHANGELOG.md` files
   - Commit the changes
   - Push the release branch to GitHub

1. **Create PR to main**
    - Create a Pull Request from your release branch into `main`
    - Get approval and merge the PR into `main`

2. **Release**
    - Create a new release on GitHub with just a tag name (e.g. `v0.20.0`)
      - The `publish` automation will publish the new version to external sites (e.g. npm) and update the GitHub release with the changelog details and artifacts
    - Await/request approval of the publish workflow

3. **Post-Release**
    - Check the publish action to make sure all deployments succeeded
    - Check https://developer.smartbear.com/smartbear-mcp/ to ensure the docs have been updated correctly

Please ensure you update internal ticketing systems accordingly.

## Additional Resources

- [Model Context Protocol Specification](https://modelcontextprotocol.io/specification/2025-03-26)

---

Thank you for contributing to SmartBear MCP Server! 🎉
