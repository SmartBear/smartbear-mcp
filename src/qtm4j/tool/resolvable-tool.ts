/**
 * ResolvableTool — Abstract Base Class
 *
 * Extends the base Tool class to add automatic field resolution.
 * Subclasses declare their Zod schema, resolution config, and business
 * logic via `execute()`. The `handle` method is wired automatically —
 * resolution fires on every tool invocation without any manual setup.
 *
 * Usage:
 *   export class MyTool extends ResolvableTool<Qtm4jClient> {
 *     specification = { ... };
 *     schema        = MySchema;
 *     resolutionConfig = [...];
 *
 *     async execute(args, resolved, context, warnings) { ... }
 *   }
 */
import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShape, ZodSchema } from "zod";
import { Tool } from "../../common/tools";
import type { ProjectContext } from "../config/field-resolution.types";
import {
  type FieldResolutionConfig,
  type ResolvableClient,
  type ResolvedFieldMap,
  withResolution,
} from "./resolution-handler";

export abstract class ResolvableTool<
  T extends ResolvableClient,
> extends Tool<T> {
  // ─── Abstract contract (subclasses must implement) ────────────────────────

  /** Zod schema used to parse raw tool input */
  abstract readonly schema: ZodSchema<any>;

  /** Field resolution config — maps inputField names to resolver fieldKeys */
  abstract readonly resolutionConfig: FieldResolutionConfig[];

  /**
   * Business logic executed after fields are resolved.
   *
   * @param args     - Parsed input arguments (from `schema`)
   * @param resolved - Map of inputField → resolved numeric ID(s)
   * @param context  - Active project context (projectId, projectKey, etc.)
   * @param warnings - Non-fatal warnings for fields that could not be resolved
   */
  abstract execute(
    args: Record<string, unknown>,
    resolved: ResolvedFieldMap,
    context: ProjectContext,
    warnings: string[],
    // biome-ignore lint: return type matches ToolCallback contract
  ): Promise<any>;

  // ─── Auto-wired handle ─────────────────────────────────────────────────────

  /**
   * Concrete implementation of `handle`.
   * Automatically runs field resolution before delegating to `execute()`.
   * Subclasses must NOT override this — override `execute()` instead.
   */
  // biome-ignore lint: return type matches ToolCallback contract
  get handle(): ToolCallback<ZodRawShape> {
    return withResolution(
      () => this.client,
      this.schema,
      this.resolutionConfig,
      (args, resolved, context, warnings) =>
        this.execute(args, resolved, context, warnings),
    );
  }
}
