import { ToolError } from "../../common/tools";

/**
 * Shared request-body builder for QMetry's "<entity>/scope/add" endpoints,
 * which link releases and their cycles to existing entity versions
 * (requirements, test cases). QMetry treats a cycle as a build.
 */

export interface ReleaseCycleScopeSource {
  sourceProjectId: number;
  sourceReleaseId: number;
  sourceBuildId: number;
  releaseCycleMapping: Array<{ releaseId: number; cycleIds: number[] }>;
}

export interface ReleaseCycleScopeEntities<
  F extends string,
  I extends string,
  V extends string,
> {
  /** Payload field that holds the entity list, e.g. 'requirements'. */
  field: F;
  /** Entity ID field, sent as entityData[].entityId. */
  idField: I;
  /** Entity version ID field, sent as entityData[].version. */
  versionField: V;
  /** Human label used in error messages, e.g. 'Requirement'. */
  label: string;
}

const isValidId = (value: unknown): value is number =>
  typeof value === "number" && !Number.isNaN(value);

/**
 * Validates the tool payload and builds the scope/add body. Every release/
 * cycle in the mapping is linked to every listed entity.
 * @throws If a required ID is missing/invalid, a list is empty, or a
 * releaseId / entity ID is repeated.
 */
export function buildReleaseCycleScopeBody<
  F extends string,
  I extends string,
  V extends string,
>(
  fn: string,
  entityType: "RQ" | "TC",
  payload: ReleaseCycleScopeSource & {
    [K in F]: Array<{ [P in I | V]: number }>;
  },
  entities: ReleaseCycleScopeEntities<F, I, V>,
) {
  for (const field of [
    "sourceProjectId",
    "sourceReleaseId",
    "sourceBuildId",
  ] as const) {
    if (!isValidId(payload?.[field])) {
      throw new ToolError(
        `[${fn}] Missing or invalid required parameter: '${field}'.`,
      );
    }
  }

  const mapping = payload.releaseCycleMapping;
  if (!Array.isArray(mapping) || mapping.length === 0) {
    throw new ToolError(
      `[${fn}] Missing or invalid required parameter: 'releaseCycleMapping' (must be a non-empty array of { releaseId, cycleIds }).`,
    );
  }
  const seenReleases = new Set<number>();
  mapping.forEach((entry, i) => {
    if (!isValidId(entry?.releaseId)) {
      throw new ToolError(
        `[${fn}] Missing or invalid required parameter: 'releaseCycleMapping[${i}].releaseId'.`,
      );
    }
    if (
      !Array.isArray(entry.cycleIds) ||
      entry.cycleIds.length === 0 ||
      !entry.cycleIds.every(isValidId)
    ) {
      throw new ToolError(
        `[${fn}] Missing or invalid required parameter: 'releaseCycleMapping[${i}].cycleIds' (must be a non-empty array of numeric cycle IDs).`,
      );
    }
    if (seenReleases.has(entry.releaseId)) {
      throw new ToolError(
        `[${fn}] Release ${entry.releaseId} appears more than once in 'releaseCycleMapping'. Put all of its cycles in one entry.`,
      );
    }
    seenReleases.add(entry.releaseId);
  });

  const { field, idField, versionField, label } = entities;
  const list = payload[field] as Array<Record<I | V, number>> | undefined;
  if (!Array.isArray(list) || list.length === 0) {
    throw new ToolError(
      `[${fn}] Missing or invalid required parameter: '${field}' (must be a non-empty array of { ${idField}, ${versionField} }).`,
    );
  }
  const seenEntities = new Set<number>();
  list.forEach((item, i) => {
    for (const key of [idField, versionField]) {
      if (!isValidId(item?.[key])) {
        throw new ToolError(
          `[${fn}] Missing or invalid required parameter: '${field}[${i}].${key}'.`,
        );
      }
    }
    if (seenEntities.has(item[idField])) {
      throw new ToolError(
        `[${fn}] ${label} ${item[idField]} appears more than once in '${field}'. List each ${label.toLowerCase()} once.`,
      );
    }
    seenEntities.add(item[idField]);
  });

  return {
    sourceBuildId: payload.sourceBuildId,
    sourceProjectId: payload.sourceProjectId,
    sourceReleaseId: payload.sourceReleaseId,
    sourceScope: "project",
    entityType,
    releaseCycleMapping: mapping.map((entry) => ({
      release: entry.releaseId,
      cycle: entry.cycleIds,
      version: 1,
    })),
    opType: "otherScope",
    withVersion: true,
    updateFlag: false,
    destinationProjectId: payload.sourceProjectId,
    entityData: list.map((item) => ({
      entityId: item[idField],
      version: item[versionField],
    })),
  };
}
