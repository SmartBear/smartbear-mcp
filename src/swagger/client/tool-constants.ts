export const READ_ONLY = {
  readOnly: true,
  openWorld: false,
  destructive: false,
} as const;

export const WRITE = {
  readOnly: false,
  openWorld: false,
  destructive: false,
} as const;

export const WRITE_DESTRUCTIVE = {
  readOnly: false,
  openWorld: false,
  destructive: true,
} as const;
