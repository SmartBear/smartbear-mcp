export const QMETRY_DEFAULTS = {
  BASE_URL: "https://testmanagement.qmetry.com",
  PROJECT_KEY: "default",
};

export const ENTITY_KEYS = {
  TESTCASE: "testcase",
} as const;

export type EntityKey = (typeof ENTITY_KEYS)[keyof typeof ENTITY_KEYS];
