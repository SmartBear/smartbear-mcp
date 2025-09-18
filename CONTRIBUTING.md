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

Releases are automatically deployed on merge to `main` (see [below](#releases)), so in order to coordinate a release between the various products a `next` branch is used to accumulate changes and avoid unintentionally releasing part changes.

Please read the following guidance:

- Feature branches should be created from `next` and PRs made into `next`
- If your change is noteworthy to our customers, update the [CHANGELOG.md](./CHANGELOG.md) in your PR with details of your changes
  - You may need to create a new section if your change is the first since the last release
- This is a public repo, so consider a squash-commit of your feature PRs to give a cleaner history
- Create `integration/` branches from `next` if you want to keep a larger change away from the release during development
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

Documentation lives in the `/docs` directory of this repo. Changes to the documentation will be automatically deployed to the docs site when merged to `main` and to an internal staging site when merged to `next`. For full information please see the [SwaggerHub Portal Management](https://github.com/frankkilcommins/SwaggerHub-Portal-Management) docs.

## Releases

A release will be carried out by a member of the SmartBear team when a set of releasable changes is ready on the `next` branch. If the are commits from more than one product, the releasing engineer will coordinate with the each product team to ensure the release is appropriate and sufficiently documented in the changelog/docs.

Please follow these steps to create a new release:

1. **Decide on a version number**
    - Check the changes in `CHANGELOG.md` and using [semantic versioning](https://semver.org/), decide on a new version. i.e. `1.2.3`

2. **Create Release Branch**
    ```bash
    git checkout next
    git pull
    git checkout -b release/v1.2.3
    ```

3. **Update the Version**
    - Use `npm version patch|minor|major` to increment the version number
    - Update the version number and release date in the `CHANGELOG.md` to match
    - Push the changes to GitHub and create a Pull Request from your release branch into `main`

4. **Release**
    - Create a new Github release with the version you decided on earlier
    - Changes will be automatically deployed once the Github release is created

5. **Post-Release**
    - A PR should automatically be created to merge `main` back into `next`, this should be merged down soon after release
    - Check https://developer.smartbear.com/smartbear-mcp/ to ensure the docs have been updated correctly

Please ensure you update internal ticketing systems accordingly.

## Additional Resources

- [Model Context Protocol Specification](https://modelcontextprotocol.io/specification/2025-03-26)

---

Thank you for contributing to SmartBear MCP Server! 🎉
