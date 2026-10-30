import { beforeEach, describe, expect, it, vi } from "vitest";
import Bugsnag from "../../../common/bugsnag";
import { EmptyOutputSchema } from "./common";
import { advisoryOutputSchema, PACTFLOW_OUTPUT_SCHEMAS } from "./output";

vi.mock("../../../common/bugsnag", () => ({ default: { notify: vi.fn() } }));

import { TOOLS } from "../tools";

describe("PactFlow output schemas", () => {
  it("defines an output schema for every tool", () => {
    const missing = TOOLS.filter(
      (tool) => !PACTFLOW_OUTPUT_SCHEMAS[tool.handler],
    ).map((tool) => tool.handler);
    expect(missing).toEqual([]);
  });

  it("has no schema for a handler that is not a tool", () => {
    const handlers = new Set(TOOLS.map((tool) => tool.handler));
    const unused = Object.keys(PACTFLOW_OUTPUT_SCHEMAS).filter(
      (handler) => !handlers.has(handler),
    );
    expect(unused).toEqual([]);
  });

  it("accepts a HAL response with extra fields and missing optional ones", () => {
    const schema = PACTFLOW_OUTPUT_SCHEMAS.listEnvironments;
    expect(
      schema.safeParse({
        _embedded: { environments: [{ name: "prod", extra: true }] },
        pagination: { pageNumber: 1 },
      }).success,
    ).toBe(true);
  });

  it("rejects a mistyped field", () => {
    const schema = PACTFLOW_OUTPUT_SCHEMAS.listEnvironments;
    expect(
      schema.safeParse({ _embedded: { environments: "nope" } }).success,
    ).toBe(false);
  });

  it("describes the response of tools the OpenAPI document does not cover", () => {
    expect(
      PACTFLOW_OUTPUT_SCHEMAS.getProviderStates.safeParse({
        providerStates: [{ name: "a user exists", consumers: ["web"] }],
      }).success,
    ).toBe(true);
    expect(
      PACTFLOW_OUTPUT_SCHEMAS.review.safeParse({
        recommendations: [{ recommendation: "Use matchers" }],
      }).success,
    ).toBe(true);
  });

  it("describes bodiless operations as a success flag", () => {
    expect(
      PACTFLOW_OUTPUT_SCHEMAS.deletePacticipant.safeParse({ success: true })
        .success,
    ).toBe(true);
    expect(
      PACTFLOW_OUTPUT_SCHEMAS.deletePacticipant.safeParse({}).success,
    ).toBe(false);
    expect(EmptyOutputSchema.safeParse({ success: true }).success).toBe(true);
  });

  describe("advertised JSON Schema", () => {
    const jsonSchema = (handler: string) =>
      PACTFLOW_OUTPUT_SCHEMAS[handler]["~standard"].jsonSchema.output({
        target: "draft-2020-12",
      }) as Record<string, any>;

    it("is an inline object at the root, never a bare $ref", () => {
      for (const handler of Object.keys(PACTFLOW_OUTPUT_SCHEMAS)) {
        const schema = jsonSchema(handler);
        expect(schema.type, handler).toBe("object");
        expect(schema.$ref, handler).toBeUndefined();
      }
    });

    it("shares nested schemas through $defs", () => {
      const schema = jsonSchema("getBiDirectionalProviderContract");
      expect(Object.keys(schema.$defs)).toContain(
        "PacticipantVersionWithoutLinks",
      );
      expect(JSON.stringify(schema).length).toBeLessThan(8000);
    });

    it("has no two identical shared schemas", () => {
      const defs = new Map<string, string>();
      for (const handler of Object.keys(PACTFLOW_OUTPUT_SCHEMAS)) {
        for (const [id, def] of Object.entries(
          jsonSchema(handler).$defs ?? {},
        )) {
          const { id: _, ...shape } = def as Record<string, unknown>;
          defs.set(id, JSON.stringify(shape));
        }
      }
      const byShape = new Map<string, string[]>();
      for (const [id, shape] of defs) {
        byShape.set(shape, [...(byShape.get(shape) ?? []), id]);
      }
      const duplicates = [...byShape.values()].filter((ids) => ids.length > 1);
      expect(duplicates).toEqual([]);
    });
  });

  describe("advisoryOutputSchema", () => {
    beforeEach(() => {
      vi.mocked(Bugsnag.notify).mockClear();
      vi.spyOn(console, "error").mockImplementation(() => {});
    });

    it("passes a mismatching response through and reports it once per tool", async () => {
      const schema = advisoryOutputSchema(
        PACTFLOW_OUTPUT_SCHEMAS.getMetrics,
        "Advisory Tool",
      );
      const bad = { matrix: { count: "many" } };

      const first = await schema["~standard"].validate(bad);
      const second = await schema["~standard"].validate(bad);

      expect(first).toEqual({ value: bad });
      expect(second).toEqual({ value: bad });
      expect(Bugsnag.notify).toHaveBeenCalledTimes(1);
    });

    it("stays silent for a matching response", async () => {
      const schema = advisoryOutputSchema(
        PACTFLOW_OUTPUT_SCHEMAS.getMetrics,
        "Quiet Tool",
      );

      const result = await schema["~standard"].validate({
        matrix: { count: -1 },
      });

      expect(result.issues).toBeUndefined();
      expect(Bugsnag.notify).not.toHaveBeenCalled();
    });

    it("still advertises the full schema", () => {
      const schema = advisoryOutputSchema(
        PACTFLOW_OUTPUT_SCHEMAS.getMetrics,
        "Advertised Tool",
      );

      expect(
        schema["~standard"].jsonSchema.output({ target: "draft-2020-12" }),
      ).toEqual(
        PACTFLOW_OUTPUT_SCHEMAS.getMetrics["~standard"].jsonSchema.output({
          target: "draft-2020-12",
        }),
      );
    });
  });
});
