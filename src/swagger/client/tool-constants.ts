export const READ_ONLY = {
  readOnly: true,
  openWorld: false,
  destructive: false,
} as const;

export const WRITE = {
  readOnly: false,
  openWorld: true,
  destructive: false,
} as const;

export const WRITE_DESTRUCTIVE = {
  readOnly: false,
  openWorld: true,
  destructive: true,
} as const;

// Registry operations that modify internal state but don't access external systems
export const WRITE_INTERNAL = {
  readOnly: false,
  openWorld: false,
  destructive: true,
} as const;
