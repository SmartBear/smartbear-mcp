// workaround for a known issue with Bugsnag types in node16 modules: https://github.com/bugsnag/bugsnag-js/issues/2052
// biome-ignore lint/performance/noNamespaceImport: required by the workaround above
import * as Bugsnag from "@bugsnag/js";
// biome-ignore lint/style/noDefaultExport: mirrors the shape of the @bugsnag/js default export this module re-exports
export default Bugsnag.default as unknown as typeof Bugsnag.default;

export type { Event as BugsnagEvent } from "@bugsnag/js/types";
