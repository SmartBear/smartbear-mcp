import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import {
  stripEmptyAdditionalProperties,
  withPortableJsonSchema,
} from "./schema-portability";

import "./register-clients";
import { clientRegistry } from "./client-registry";
import { SmartBearMcpServer } from "./server";

const JSON_SCHEMA_TARGET = "draft-2020-12";

/** Converts a schema the way @modelcontextprotocol/server does when listing tools. */
function advertisedSchema(schema: any, io: "input" | "output"): any {
  return schema?.["~standard"]?.jsonSchema?.[io]({
    target: JSON_SCHEMA_TARGET,
  });
}

/** Collects every JSON pointer at which `additionalProperties` is `{}`. */
function emptyAdditionalPropertiesPaths(node: any, path = "$"): string[] {
  if (Array.isArray(node)) {
    return node.flatMap((item, i) =>
      emptyAdditionalPropertiesPaths(item, `${path}[${i}]`),
    );
  }
  if (typeof node !== "object" || node === null) {
    return [];
  }
  const found: string[] = [];
  for (const [key, value] of Object.entries(node)) {
    if (
      key === "additionalProperties" &&
      typeof value === "object" &&
      value !== null &&
      !Array.isArray(value) &&
      Object.keys(value).length === 0
    ) {
      found.push(`${path}.${key}`);
    }
    found.push(...emptyAdditionalPropertiesPaths(value, `${path}.${key}`));
  }
  return found;
}

describe("stripEmptyAdditionalProperties", () => {
  it("removes the keyword at the root and when nested", () => {
    const result = stripEmptyAdditionalProperties({
      type: "object",
      properties: {
        values: {
          type: "array",
          items: { type: "object", additionalProperties: {} },
        },
      },
      additionalProperties: {},
    });

    expect(result).toEqual({
      type: "object",
      properties: {
        values: { type: "array", items: { type: "object" } },
      },
    });
  });

  it("keeps additionalProperties that actually constrain something", () => {
    const schema = {
      a: { type: "object", additionalProperties: false },
      b: { type: "object", additionalProperties: true },
      c: { type: "object", additionalProperties: { type: "string" } },
    };

    expect(stripEmptyAdditionalProperties(schema)).toEqual(schema);
  });

  it("recurses through composition keywords and $defs", () => {
    const result = stripEmptyAdditionalProperties({
      $defs: { Item: { type: "object", additionalProperties: {} } },
      anyOf: [{ type: "object", additionalProperties: {} }, { type: "null" }],
    });

    expect(result).toEqual({
      $defs: { Item: { type: "object" } },
      anyOf: [{ type: "object" }, { type: "null" }],
    });
  });

  it("does not strip a property that is merely named additionalProperties", () => {
    const schema = {
      type: "object",
      properties: { additionalProperties: {} },
    };

    expect(stripEmptyAdditionalProperties(schema)).toEqual(schema);
  });

  it("does not mutate its input", () => {
    const schema = { type: "object", additionalProperties: {} };
    stripEmptyAdditionalProperties(schema);
    expect(schema).toEqual({ type: "object", additionalProperties: {} });
  });
});

describe("withPortableJsonSchema", () => {
  const looseSchema = z.looseObject({
    id: z.int(),
    values: z.array(z.looseObject({ key: z.string() })).optional(),
  });

  it("emits no empty additionalProperties for a loose object", () => {
    // Guard the premise: unwrapped, Zod emits the construct we are removing.
    expect(
      emptyAdditionalPropertiesPaths(advertisedSchema(looseSchema, "output")),
    ).toHaveLength(2);

    const wrapped = withPortableJsonSchema(looseSchema);
    expect(
      emptyAdditionalPropertiesPaths(advertisedSchema(wrapped, "output")),
    ).toEqual([]);
    expect(
      emptyAdditionalPropertiesPaths(advertisedSchema(wrapped, "input")),
    ).toEqual([]);
  });

  it("keeps the schema otherwise intact", () => {
    const advertised = advertisedSchema(
      withPortableJsonSchema(looseSchema),
      "output",
    );
    expect(advertised.type).toBe("object");
    expect(Object.keys(advertised.properties)).toEqual(["id", "values"]);
    expect(advertised.required).toEqual(["id"]);
  });

  it("leaves validation to the underlying Zod schema", () => {
    const wrapped: any = withPortableJsonSchema(looseSchema);

    // Extra keys are still accepted, which is the point of looseObject.
    const result = wrapped["~standard"].validate({ id: 1, extra: "kept" });
    expect(result.issues).toBeUndefined();
    expect(result.value).toEqual({ id: 1, extra: "kept" });

    expect(wrapped["~standard"].validate({ id: "nope" }).issues).toBeDefined();
  });

  it("still behaves like the underlying Zod schema", () => {
    const wrapped: any = withPortableJsonSchema(looseSchema);
    expect(Object.keys(wrapped.shape)).toEqual(["id", "values"]);
    expect(wrapped.parse({ id: 7 })).toEqual({ id: 7 });
  });

  it("passes through values that are not standard schemas", () => {
    expect(withPortableJsonSchema(undefined)).toBeUndefined();
    expect(withPortableJsonSchema({ not: "a schema" })).toEqual({
      not: "a schema",
    });
  });
});

describe("registered tools advertise portable schemas", () => {
  it("no tool emits an empty additionalProperties", async () => {
    const server = new SmartBearMcpServer();
    const offenders: string[] = [];
    let inspected = 0;

    vi.spyOn(
      Object.getPrototypeOf(Object.getPrototypeOf(server)),
      "registerTool",
    ).mockImplementation(((toolName: string, config: any) => {
      for (const io of ["input", "output"] as const) {
        const schema =
          io === "input" ? config.inputSchema : config.outputSchema;
        const advertised = advertisedSchema(schema, io);
        if (advertised === undefined) {
          continue;
        }
        inspected++;
        for (const path of emptyAdditionalPropertiesPaths(advertised)) {
          offenders.push(`${toolName}.${io}Schema${path.slice(1)}`);
        }
      }
    }) as any);

    for (const client of clientRegistry.getAll()) {
      await server.addClient(client);
    }

    expect(offenders).toEqual([]);
    // Guard against the assertion above passing vacuously if schema conversion
    // ever stops resolving.
    expect(inspected).toBeGreaterThan(100);
  });
});
