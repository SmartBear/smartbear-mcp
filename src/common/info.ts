import packageJson from "../../package.json" with { type: "json" };
export const MCP_SERVER_NAME = packageJson.config.mcpServerName;
export const MCP_SERVER_VERSION = packageJson.version;
