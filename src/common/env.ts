import process from "node:process";

/**
 * Central access point for environment variables.
 *
 * This is the single module permitted to read from / write to `process.env`
 * (see the `noProcessEnv` override in biome.jsonc). Everything else should route
 * environment access through these helpers so configuration parsing stays in one
 * place and is easy to audit, mock, or migrate to another configuration source.
 */

/** Read an environment variable, or `undefined` if it is not set. */
export function getEnv(name: string): string | undefined {
  return process.env[name];
}

/**
 * Set an environment variable. Used for backward-compatibility aliasing of
 * renamed variables; prefer `getEnv` for ordinary configuration reads.
 */
export function setEnv(name: string, value: string): void {
  process.env[name] = value;
}
