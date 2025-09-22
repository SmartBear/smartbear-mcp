import { ENTITY_KEYS, EntityKey } from "../config/constants.js";
import { TEST_CASE } from "./testcase.js";

export const PARAM_REGISTRY: Record<EntityKey, any[]> = {
  [ENTITY_KEYS.TESTCASE]: TEST_CASE.PARAMETERS,
};
