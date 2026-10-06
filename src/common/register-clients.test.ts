import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const products = [
  ["bearq", "BearQ", "BearQClient"],
  ["reflect", "Reflect", "ReflectClient"],
  ["bugsnag", "BugSnag", "BugsnagClient"],
  ["swagger", "Swagger", "SwaggerClient"],
  ["pactflow", "Contract Testing", "PactflowClient"],
  ["qmetry", "QMetry", "QmetryClient"],
  ["zephyr", "Zephyr", "ZephyrClient"],
  ["qtm4j", "QTM4J", "Qtm4jClient"],
  ["collaborator", "Collaborator", "CollaboratorClient"],
] as const;

describe("client module loading", () => {
  let importedProducts: string[];

  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("MCP_CLIENTS", "");
    vi.stubEnv("MCP_TOOLSETS", "");
    importedProducts = [];
    for (const [directory, name, exportName] of products) {
      vi.doMock(`../${directory}/client`, () => {
        importedProducts.push(name);
        return {
          [exportName]: class {
            name = name;
          },
        };
      });
    }
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    for (const [directory] of products) {
      vi.doUnmock(`../${directory}/client`);
    }
    vi.resetModules();
  });

  async function registeredNames() {
    await import("./register-clients");
    const { clientRegistry } = await import("./client-registry");
    return clientRegistry.getAll().map((client) => client.name);
  }

  it("loads all products when no selection is configured", async () => {
    const names = products.map(([, name]) => name);
    expect(await registeredNames()).toEqual(names);
    expect(importedProducts).toEqual(names);
  });

  it("does not import disabled products", async () => {
    vi.stubEnv("MCP_CLIENTS", " bugsnag, COLLABORATOR ");
    expect(await registeredNames()).toEqual(["BugSnag", "Collaborator"]);
    expect(importedProducts).toEqual(["BugSnag", "Collaborator"]);
  });

  it("also loads products enabled through toolsets", async () => {
    vi.stubEnv("MCP_CLIENTS", "Collaborator");
    vi.stubEnv("MCP_TOOLSETS", " bugsnag:Projects, BUGSNAG:Errors ");
    expect(await registeredNames()).toEqual(["BugSnag", "Collaborator"]);
    expect(importedProducts).toEqual(["BugSnag", "Collaborator"]);
  });

  it("supports toolsets without MCP_CLIENTS", async () => {
    vi.stubEnv("MCP_TOOLSETS", "reflect:Tests");
    expect(await registeredNames()).toEqual(["Reflect"]);
    expect(importedProducts).toEqual(["Reflect"]);
  });

  it("preserves the Contract Testing product name", async () => {
    vi.stubEnv("MCP_CLIENTS", "contract testing");
    expect(await registeredNames()).toEqual(["Contract Testing"]);
    expect(importedProducts).toEqual(["Contract Testing"]);
  });

  it("imports no products for an unknown selection", async () => {
    vi.stubEnv("MCP_CLIENTS", "unknown");
    expect(await registeredNames()).toEqual([]);
    expect(importedProducts).toEqual([]);
  });
});
