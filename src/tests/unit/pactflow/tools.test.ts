// tools.test.ts

import { describe, expect, it } from "vitest";
import type { ZodObject, ZodTypeAny } from "zod";
import type { ClientType } from "../../../pactflow/client/tools";
import { TOOLS } from "../../../pactflow/client/tools";

describe("TOOLS definition for 'Generate Pact Tests'", () => {
  it("defines the generate pact tests tool with correct metadata", () => {
    const tool = TOOLS.find((t) => t.title === "Generate Pact Tests");
    expect(tool).toBeDefined();
    expect(tool?.summary).toMatch(/Generate Pact tests using PactFlow AI/);
    expect(tool?.clients).toEqual(["pactflow"]);
    expect(tool?.handler).toBe("generate");
  });

  it("rejects unsupported language values in the language field", () => {
    const tool = TOOLS.find((t) => t.title === "Generate Pact Tests");
    const schema = tool?.inputSchema as ZodObject<{
      [key: string]: ZodTypeAny;
    }>;
    const languageSchema = schema.shape.language;
    expect(languageSchema).toBeDefined();

    const invalidData = "ruby"; // not in enum
    expect(() => languageSchema?.parse(invalidData)).toThrow();
  });
});

describe("TOOLS definition for 'Get Metrics'", () => {
  it("defines the metrics tool with correct metadata", () => {
    const tool = TOOLS.find((t) => t.title === "Get Metrics");
    expect(tool).toBeDefined();
    expect(tool?.summary).toMatch(/Fetch metrics across the entire workspace/);
    expect(tool?.handler).toBe("getMetrics");
    expect(tool?.clients).toContain("pactflow");
    expect(tool?.clients).toContain("pact_broker");
  });

  it("has correct schema for metrics tool", () => {
    const tool = TOOLS.find((t) => t.title === "Get Metrics");
    const schema = tool?.inputSchema as ZodObject<{
      [key: string]: ZodTypeAny;
    }>;
    expect(schema).toBeDefined();
    // Metrics tool takes no required parameters
    const result = schema.safeParse({});
    expect(result.success).toBe(true);
  });
});

describe("TOOLS definition for 'Get Team Metrics'", () => {
  it("defines the team metrics tool with correct metadata", () => {
    const tool = TOOLS.find((t) => t.title === "Get Team Metrics");
    expect(tool).toBeDefined();
    expect(tool?.summary).toMatch(/Fetch metrics for all teams/);
    expect(tool?.handler).toBe("getTeamMetrics");
    expect(tool?.clients).toContain("pactflow");
  });

  it("accepts no parameters for team metrics tool", () => {
    const tool = TOOLS.find((t) => t.title === "Get Team Metrics");
    const schema = tool?.inputSchema as ZodObject<{
      [key: string]: ZodTypeAny;
    }>;
    expect(schema).toBeDefined();

    // Should succeed with no parameters
    const resultWithoutParams = schema.safeParse({});
    expect(resultWithoutParams.success).toBe(true);

    // Should succeed with unexpected parameters (z.object({}) allows extra keys by default)
    const resultWithParams = schema.safeParse({ teamId: "team-123" });
    expect(resultWithParams.success).toBe(true);
  });
});

// Helper to find a tool and assert it exists
function findTool(title: string) {
  const tool = TOOLS.find((t) => t.title === title);
  expect(tool).toBeDefined();
  if (!tool) throw new Error(`Tool with title "${title}" not found`);
  return tool;
}

describe("TOOLS definition for 'List Pacticipants'", () => {
  it("has correct metadata", () => {
    const tool = findTool("List Pacticipants");
    expect(tool.handler).toBe("listPacticipants");
    expect(tool.clients).toContain("pactflow");
    expect(tool.clients).toContain("pact_broker");
  });

  it("accepts optional pagination params", () => {
    const tool = findTool("List Pacticipants");
    const schema = tool.inputSchema as ZodObject<{ [key: string]: ZodTypeAny }>;
    expect(schema.safeParse({}).success).toBe(true);
    expect(schema.safeParse({ pageNumber: 2, pageSize: 50 }).success).toBe(
      true,
    );
  });
});

describe("TOOLS definition for 'Get Pacticipant'", () => {
  it("has correct metadata", () => {
    const tool = findTool("Get Pacticipant");
    expect(tool.handler).toBe("getPacticipant");
    expect(tool.clients).toEqual(
      expect.arrayContaining(["pactflow", "pact_broker"] as ClientType[]),
    );
  });

  it("requires pacticipantName", () => {
    const tool = findTool("Get Pacticipant");
    const schema = tool.inputSchema as ZodObject<{ [key: string]: ZodTypeAny }>;
    expect(schema.safeParse({}).success).toBe(false);
    expect(schema.safeParse({ pacticipantName: "ServiceA" }).success).toBe(
      true,
    );
  });
});

describe("TOOLS definition for 'List Branches'", () => {
  it("has correct metadata", () => {
    const tool = findTool("List Branches");
    expect(tool.handler).toBe("listBranches");
    expect(tool.clients).toContain("pact_broker");
  });

  it("requires pacticipantName and accepts optional filters", () => {
    const tool = findTool("List Branches");
    const schema = tool.inputSchema as ZodObject<{ [key: string]: ZodTypeAny }>;
    expect(schema.safeParse({}).success).toBe(false);
    expect(schema.safeParse({ pacticipantName: "ServiceA" }).success).toBe(
      true,
    );
    expect(
      schema.safeParse({
        pacticipantName: "ServiceA",
        q: "feat",
        pageNumber: 1,
        pageSize: 20,
      }).success,
    ).toBe(true);
  });
});

describe("TOOLS definition for 'Get Pacticipant Version'", () => {
  it("has correct metadata and requires both name and version", () => {
    const tool = findTool("Get Pacticipant Version");
    expect(tool.handler).toBe("getVersion");
    const schema = tool.inputSchema as ZodObject<{ [key: string]: ZodTypeAny }>;
    expect(schema.safeParse({}).success).toBe(false);
    expect(
      schema.safeParse({
        pacticipantName: "ServiceA",
        versionNumber: "1.0.0",
      }).success,
    ).toBe(true);
  });
});

describe("TOOLS definition for 'Get Latest Pacticipant Version'", () => {
  it("requires pacticipantName and accepts optional tag", () => {
    const tool = findTool("Get Latest Pacticipant Version");
    expect(tool.handler).toBe("getLatestVersion");
    const schema = tool.inputSchema as ZodObject<{ [key: string]: ZodTypeAny }>;
    expect(schema.safeParse({}).success).toBe(false);
    expect(schema.safeParse({ pacticipantName: "ServiceA" }).success).toBe(
      true,
    );
    expect(
      schema.safeParse({ pacticipantName: "ServiceA", tag: "prod" }).success,
    ).toBe(true);
  });
});

describe("TOOLS definition for 'List Environments'", () => {
  it("has correct metadata", () => {
    const tool = findTool("List Environments");
    expect(tool.handler).toBe("listEnvironments");
    expect(tool.clients).toContain("pactflow");
    expect(tool.clients).toContain("pact_broker");
  });
});

describe("TOOLS definition for 'Get Environment'", () => {
  it("requires environmentId", () => {
    const tool = findTool("Get Environment");
    expect(tool.handler).toBe("getEnvironment");
    const schema = tool.inputSchema as ZodObject<{ [key: string]: ZodTypeAny }>;
    expect(schema.safeParse({}).success).toBe(false);
    expect(schema.safeParse({ environmentId: "uuid-1" }).success).toBe(true);
  });
});

describe("TOOLS definition for 'Record Deployment'", () => {
  it("has correct metadata", () => {
    const tool = findTool("Record Deployment");
    expect(tool.handler).toBe("recordDeployment");
    expect(tool.clients).toContain("pactflow");
    expect(tool.clients).toContain("pact_broker");
  });

  it("requires pacticipantName, versionNumber, and environmentId", () => {
    const tool = findTool("Record Deployment");
    const schema = tool.inputSchema as ZodObject<{ [key: string]: ZodTypeAny }>;
    expect(schema.safeParse({}).success).toBe(false);
    expect(
      schema.safeParse({
        pacticipantName: "ServiceA",
        versionNumber: "1.0.0",
        environmentId: "env-uuid",
      }).success,
    ).toBe(true);
    expect(
      schema.safeParse({
        pacticipantName: "ServiceA",
        versionNumber: "1.0.0",
        environmentId: "env-uuid",
        applicationInstance: "blue",
      }).success,
    ).toBe(true);
  });
});

describe("TOOLS definition for 'Record Release'", () => {
  it("has correct metadata and schema", () => {
    const tool = findTool("Record Release");
    expect(tool.handler).toBe("recordRelease");
    const schema = tool.inputSchema as ZodObject<{ [key: string]: ZodTypeAny }>;
    expect(
      schema.safeParse({
        pacticipantName: "AppMobile",
        versionNumber: "1.2.0",
        environmentId: "env-uuid",
      }).success,
    ).toBe(true);
  });
});

describe("TOOLS definition for 'Publish Consumer Contracts'", () => {
  it("has correct metadata", () => {
    const tool = findTool("Publish Consumer Contracts");
    expect(tool.handler).toBe("publishContracts");
    expect(tool.clients).toContain("pactflow");
    expect(tool.clients).toContain("pact_broker");
  });

  it("requires mandatory contract fields", () => {
    const tool = findTool("Publish Consumer Contracts");
    const schema = tool.inputSchema as ZodObject<{ [key: string]: ZodTypeAny }>;
    expect(schema.safeParse({}).success).toBe(false);
    expect(
      schema.safeParse({
        pacticipantName: "ConsumerApp",
        pacticipantVersionNumber: "1.0.0",
        contracts: [
          {
            consumerName: "ConsumerApp",
            providerName: "ProviderAPI",
            content: "base64content",
            contentType: "application/json",
            specification: "pact",
          },
        ],
      }).success,
    ).toBe(true);
  });
});

describe("TOOLS definition for 'Publish Provider Contract'", () => {
  it("is only available for pactflow clients", () => {
    const tool = findTool("Publish Provider Contract");
    expect(tool.handler).toBe("publishProviderContract");
    expect(tool.clients).toEqual(["pactflow"]);
  });
});

describe("TOOLS definition for 'Get Pacts for Verification'", () => {
  it("has correct metadata and requires providerName", () => {
    const tool = findTool("Get Pacts for Verification");
    expect(tool.handler).toBe("getPactsForVerification");
    const schema = tool.inputSchema as ZodObject<{ [key: string]: ZodTypeAny }>;
    expect(schema.safeParse({}).success).toBe(false);
    expect(schema.safeParse({ providerName: "ProviderAPI" }).success).toBe(
      true,
    );
  });
});

describe("TOOLS definitions for BDCT tools", () => {
  const bdctProviderTools = [
    {
      title: "Get BDCT Provider Contract",
      handler: "getBiDirectionalProviderContract",
    },
    {
      title: "Get BDCT Provider Contract Verification Results",
      handler: "getBiDirectionalProviderContractVerificationResults",
    },
    {
      title: "Get BDCT Consumer Contracts",
      handler: "getBiDirectionalConsumerContract",
    },
    {
      title: "Get BDCT Consumer Contract Verification Results",
      handler: "getBiDirectionalConsumerContractVerificationResults",
    },
    {
      title: "Get BDCT Cross-Contract Verification Results",
      handler: "getBiDirectionalCrossContractVerificationResults",
    },
  ];

  for (const { title, handler } of bdctProviderTools) {
    it(`"${title}" requires providerName and providerVersionNumber`, () => {
      const tool = findTool(title);
      expect(tool.handler).toBe(handler);
      expect(tool.clients).toEqual(["pactflow"]);
      const schema = tool.inputSchema as ZodObject<{
        [key: string]: ZodTypeAny;
      }>;
      expect(schema.safeParse({}).success).toBe(false);
      expect(
        schema.safeParse({
          providerName: "ProviderAPI",
          providerVersionNumber: "2.0.0",
        }).success,
      ).toBe(true);
    });
  }

  const bdctConsumerTools = [
    {
      title: "Get BDCT Consumer Contract by Consumer Version",
      handler: "getBiDirectionalConsumerContractByConsumer",
    },
    {
      title: "Get BDCT Provider Contract by Consumer Version",
      handler: "getBiDirectionalProviderContractByConsumer",
    },
    {
      title:
        "Get BDCT Provider Contract Verification Results by Consumer Version",
      handler: "getBiDirectionalProviderContractVerificationResultsByConsumer",
    },
    {
      title:
        "Get BDCT Consumer Contract Verification Results by Consumer Version",
      handler: "getBiDirectionalConsumerContractVerificationResultsByConsumer",
    },
    {
      title: "Get BDCT Cross-Contract Verification Results by Consumer Version",
      handler: "getBiDirectionalCrossContractVerificationResultsByConsumer",
    },
  ];

  for (const { title, handler } of bdctConsumerTools) {
    it(`"${title}" requires all four version fields`, () => {
      const tool = findTool(title);
      expect(tool.handler).toBe(handler);
      expect(tool.clients).toEqual(["pactflow"]);
      const schema = tool.inputSchema as ZodObject<{
        [key: string]: ZodTypeAny;
      }>;
      expect(schema.safeParse({}).success).toBe(false);
      expect(
        schema.safeParse({
          providerName: "ProviderAPI",
          providerVersionNumber: "2.0.0",
          consumerName: "ConsumerApp",
          consumerVersionNumber: "1.0.0",
        }).success,
      ).toBe(true);
    });
  }
});

describe("TOOLS definition for 'List Integrations'", () => {
  it("has correct metadata", () => {
    const tool = findTool("List Integrations");
    expect(tool.handler).toBe("listIntegrations");
    expect(tool.clients).toContain("pactflow");
    expect(tool.clients).toContain("pact_broker");
  });
});

describe("TOOLS definition for 'Get Pacticipant Network'", () => {
  it("requires pacticipantName", () => {
    const tool = findTool("Get Pacticipant Network");
    expect(tool.handler).toBe("getPacticipantNetwork");
    const schema = tool.inputSchema as ZodObject<{ [key: string]: ZodTypeAny }>;
    expect(schema.safeParse({}).success).toBe(false);
    expect(schema.safeParse({ pacticipantName: "ServiceA" }).success).toBe(
      true,
    );
  });
});

describe("TOOLS definition for 'List Labels'", () => {
  it("has correct metadata", () => {
    const tool = findTool("List Labels");
    expect(tool.handler).toBe("listLabels");
    expect(tool.clients).toContain("pactflow");
    expect(tool.clients).toContain("pact_broker");
  });
});

describe("TOOLS definition for 'Get Pacticipant Label'", () => {
  it("requires pacticipantName and labelName", () => {
    const tool = findTool("Get Pacticipant Label");
    expect(tool.handler).toBe("getPacticipantLabel");
    const schema = tool.inputSchema as ZodObject<{ [key: string]: ZodTypeAny }>;
    expect(schema.safeParse({ pacticipantName: "ServiceA" }).success).toBe(
      false,
    );
    expect(
      schema.safeParse({ pacticipantName: "ServiceA", labelName: "team-a" })
        .success,
    ).toBe(true);
  });
});

describe("TOOLS definition for 'List Pacticipants by Label'", () => {
  it("requires labelName", () => {
    const tool = findTool("List Pacticipants by Label");
    expect(tool.handler).toBe("listPacticipantsByLabel");
    const schema = tool.inputSchema as ZodObject<{ [key: string]: ZodTypeAny }>;
    expect(schema.safeParse({}).success).toBe(false);
    expect(schema.safeParse({ labelName: "team-a" }).success).toBe(true);
  });
});

describe("TOOLS definitions for pacticipant update tools", () => {
  it("'Update Pacticipant' uses PUT handler and shared clients", () => {
    const tool = findTool("Update Pacticipant");
    expect(tool.handler).toBe("updatePacticipant");
    expect(tool.clients).toContain("pactflow");
    expect(tool.clients).toContain("pact_broker");
  });

  it("'Patch Pacticipant' uses PATCH handler and shared clients", () => {
    const tool = findTool("Patch Pacticipant");
    expect(tool.handler).toBe("patchPacticipant");
    expect(tool.clients).toContain("pactflow");
    expect(tool.clients).toContain("pact_broker");
  });

  it("both update tools require pacticipantName", () => {
    for (const title of ["Update Pacticipant", "Patch Pacticipant"]) {
      const tool = findTool(title);
      const schema = tool.inputSchema as ZodObject<{
        [key: string]: ZodTypeAny;
      }>;
      expect(schema.safeParse({}).success).toBe(false);
      expect(schema.safeParse({ pacticipantName: "ServiceA" }).success).toBe(
        true,
      );
    }
  });
});

describe("TOOLS definition for 'Update Pacticipant Version'", () => {
  it("requires pacticipantName and versionNumber", () => {
    const tool = findTool("Update Pacticipant Version");
    expect(tool.handler).toBe("updateVersion");
    const schema = tool.inputSchema as ZodObject<{ [key: string]: ZodTypeAny }>;
    expect(schema.safeParse({}).success).toBe(false);
    expect(
      schema.safeParse({
        pacticipantName: "ServiceA",
        versionNumber: "1.0.0",
      }).success,
    ).toBe(true);
  });
});

describe("TOOLS definition for 'Get Branch Versions'", () => {
  it("requires pacticipantName and branchName", () => {
    const tool = findTool("Get Branch Versions");
    expect(tool.handler).toBe("getBranchVersions");
    const schema = tool.inputSchema as ZodObject<{ [key: string]: ZodTypeAny }>;
    expect(schema.safeParse({ pacticipantName: "ServiceA" }).success).toBe(
      false,
    );
    expect(
      schema.safeParse({
        pacticipantName: "ServiceA",
        branchName: "main",
      }).success,
    ).toBe(true);
  });
});

describe("TOOLS definitions for deployed/released version tools", () => {
  const versionEnvTools = [
    {
      title: "Get Deployed Versions for Version",
      handler: "getDeployedVersions",
    },
    {
      title: "Get Released Versions for Version",
      handler: "getReleasedVersions",
    },
  ];

  for (const { title, handler } of versionEnvTools) {
    it(`"${title}" requires pacticipantName, versionNumber, and environmentId`, () => {
      const tool = findTool(title);
      expect(tool.handler).toBe(handler);
      expect(tool.clients).toContain("pactflow");
      expect(tool.clients).toContain("pact_broker");
      const schema = tool.inputSchema as ZodObject<{
        [key: string]: ZodTypeAny;
      }>;
      expect(schema.safeParse({}).success).toBe(false);
      expect(
        schema.safeParse({
          pacticipantName: "ServiceA",
          versionNumber: "1.0.0",
          environmentId: "env-uuid",
        }).success,
      ).toBe(true);
    });
  }
});
