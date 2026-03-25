// workaround for a known issue with Bugsnag types in node16 modules: https://github.com/bugsnag/bugsnag-js/issues/2052
import * as Bugsnag from "@bugsnag/js";
// @ts-expect-error
export default Bugsnag.default as unknown as typeof Bugsnag.default.default;
