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

Guidance:

- Create feature branches from `main`; open PRs back into `main`.
- Use `integration/<name>` branches (from `main`) for multi-stage or larger changes; merge when the whole change is releasable.
- Treat every merge to `main` as potentially releasable by any product team.
- If your change is noteworthy to customers, update `CHANGELOG.md` in your PR with details (create a new version section if it is the first change since the last release).
- Prefer squash commits for feature PRs to keep the public history clean.

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

## Documentation

Documentation lives in the `/docs` directory of this repo. Changes to the documentation will be automatically deployed to the docs site when merged to `main` and to a SmartBear-internal staging site when merged to `next`. For full information on the markdown syntax allowed in these docs, please see the [SwaggerHub Portal Management](https://github.com/frankkilcommins/SwaggerHub-Portal-Management) docs.

### Previewing docs

Merging a PR into `main` automatically publishes the documentation to the preview site for review prior to a tagged release going live.

To manually trigger a preview (if needed before merging), you can still run the "Publish Portal Content" GitHub Action against your branch. The shared preview site:

- https://smartbear-internal.portal.swaggerhub.com/smartbear-mcp

## Releases

Releases are created directly from `main`. Any merged change may be released once appropriately documented.

Steps:

1. **Decide Version**
   - Review `CHANGELOG.md` and select a semantic version (e.g. `1.2.3`).

2. **Prepare CHANGELOG**
   - Add a new version section with date and summary of changes.

3. **(Optional) Release Branch**
   - If coordination is needed:
     ```bash
     git checkout main
     git pull
     git checkout -b release/v1.2.3
     # finalize, open PR to main, merge
     ```

4. **Tag the Release**
   - After changes are on `main`:
     ```bash
     git checkout main
     git pull
     git tag -a v1.2.3 -m "Release v1.2.3"
     git push origin v1.2.3
     ```
   - Create a GitHub Release for tag `v1.2.3` (the `v` prefix is required).

5. **Automation**
   - Tagging `main` triggers package publishing, live docs deployment, and updates in related MCP repositories.

6. **Post-Release**
   - Verify docs at https://developer.smartbear.com/smartbear-mcp/
   - Verify NPM package at https://www.npmjs.com/package/@smartbear/mcp
   - Confirm CHANGELOG accuracy.

## Additional Resources

- [Model Context Protocol Specification](https://modelcontextprotocol.io/specification/2025-03-26)

---

Thank you for contributing to SmartBear MCP Server! 🎉
