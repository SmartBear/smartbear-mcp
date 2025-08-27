# Contributing

Thank you for your contributing to SmartBear MCP!

- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Testing Guidelines](#testing-guidelines)
- [Documentation](#documentation)
- [Releases](#releases)
- [Additional Resources](#additional-resources)

## Getting Started

### Repository Structure

```
├── api-hub/          # API Hub integration
├── insight-hub/      # Insight Hub integration  
├── pactflow/         # PactFlow integration
├── reflect/          # Reflect integration
├── common/           # Shared utilities and types
├── docs/             # Documentation
├── tests/            # Test files
└── scripts/          # Build and utility scripts
```

## Development Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Verify Setup**
   ```bash
   npm run build
   npm run lint
   npm run test:run
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

1. **Decide on a version number**
    - Check the changes in `CHANGELOG.md` and using semantic versioning, decide on a new version. i.e. `1.2.3`

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

Please ensure you update internal ticketing systems accordingly.

## Additional Resources

- [Model Context Protocol Specification](https://modelcontextprotocol.io/specification/2025-03-26)

---

Thank you for contributing to SmartBear MCP Server! 🎉