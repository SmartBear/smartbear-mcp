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

