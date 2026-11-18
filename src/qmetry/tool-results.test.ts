import { beforeEach, describe, expect, it, vi } from "vitest";
import { QmetryClient } from "./client";
import * as project from "./client/project";
import * as testcase from "./client/testcase";
import * as testsuite from "./client/testsuite";
import * as udf from "./client/udf";

vi.mock("./client/project");
vi.mock("./client/testcase");
vi.mock("./client/testsuite");
vi.mock("./client/udf");

// Tool results follow the MCP CallToolResult shape: content blocks carry only
// `type` and `text`, and a failure the model must act on is flagged with
// `isError: true` (which the common tool wrapper also records as a failed call).

async function handlerFor(title: string) {
  const client = new QmetryClient();
  await client.configure({} as any, {
    api_key: "fake-token",
    base_url: "https://qmetry.example",
  });
  const register = vi.fn();
  await client.registerTools(register, vi.fn());
  const call = register.mock.calls.find((c) => c[0].title === title);
  if (!call) throw new Error(`Tool not registered: ${title}`);
  return call[1] as (args: any, ctx?: any) => Promise<any>;
}

const mandatoryField = {
  name: "risk",
  label: "Risk",
  fieldTypeName: "STRING",
  isMandatory: true,
};

describe("QMetry tool result shape", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a plain text block without isError on success", async () => {
    vi.mocked(project.getProjectInfo).mockResolvedValue({ name: "Proj" });

    const result = await (await handlerFor("Fetch QMetry Project Info"))({});

    expect(result).toEqual({
      content: [
        { type: "text", text: JSON.stringify({ name: "Proj" }, null, 2) },
      ],
    });
    expect(result).not.toHaveProperty("isError");
  });

  it("flags Create Test Case as isError when a mandatory UDF has no value", async () => {
    vi.mocked(udf.fetchUdfLayout).mockResolvedValue({
      fields: [mandatoryField],
      systemFields: [],
      defaultValues: {},
    } as any);

    const result = await (await handlerFor("Create Test Case"))({
      name: "Login works",
      tcFolderID: "102653",
      steps: [{ orderId: 1, description: "Open the login page" }],
    });

    expect(result.isError).toBe(true);
    expect(result.content).toHaveLength(1);
    expect(Object.keys(result.content[0]).sort()).toEqual(["text", "type"]);
    expect(JSON.parse(result.content[0].text)).toMatchObject({
      code: "PREFLIGHT.MANDATORY_UDF_MISSING",
      missingFields: [{ name: "risk", label: "Risk", fieldType: "STRING" }],
    });
    expect(testcase.createTestCases).not.toHaveBeenCalled();
  });

  it("flags Create Test Suite as isError when a mandatory field has no value", async () => {
    vi.mocked(udf.fetchUdfLayout).mockResolvedValue({
      fields: [mandatoryField],
      systemFields: [],
      defaultValues: {},
    } as any);

    const result = await (await handlerFor("Create Test Suite"))({
      name: "Regression",
      parentFolderId: 1,
    });

    expect(result.isError).toBe(true);
    expect(JSON.parse(result.content[0].text)).toMatchObject({
      code: "PREFLIGHT.MANDATORY_FIELDS_MISSING",
    });
    expect(testsuite.createTestSuites).not.toHaveBeenCalled();
  });

  it("flags a domain result of { success: false } as isError", async () => {
    vi.mocked(testsuite.bulkUpdateExecutionStatus).mockResolvedValue({
      success: false,
      code: "MANDATORY_TEST_RUN_UDF_MISSING",
      statusUpdated: false,
    } as any);

    const result = await (
      await handlerFor("Bulk Update Test Case Execution Status")
    )({
      entityIDs: "66095069",
      entityType: "TCR",
      qmTsRunId: "2720260",
      runStatusID: 123268,
      viewId: 777,
      folderPath: "",
    });

    expect(result.isError).toBe(true);
    expect(JSON.parse(result.content[0].text)).toMatchObject({
      code: "MANDATORY_TEST_RUN_UDF_MISSING",
    });
  });

  it("does not flag a domain result of { success: true }", async () => {
    vi.mocked(testsuite.bulkUpdateExecutionStatus).mockResolvedValue({
      success: true,
    } as any);

    const result = await (
      await handlerFor("Bulk Update Test Case Execution Status")
    )({
      entityIDs: "66095069",
      entityType: "TCR",
      qmTsRunId: "2720260",
      runStatusID: 123268,
      viewId: 777,
      folderPath: "",
    });

    expect(result).not.toHaveProperty("isError");
  });
});
