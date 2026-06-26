export const READ_ONLY = {
  readOnly: true,
  destructive: false,
  openWorld: false,
} as const;

export const MUTATING = {
  readOnly: false,
  destructive: false,
  openWorld: true,
} as const;

export const DELETING = {
  readOnly: false,
  destructive: true,
  openWorld: true,
} as const;
