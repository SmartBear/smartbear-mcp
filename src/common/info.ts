import packageJson from "../../package.json" with { type: "json" };
export const MCP_SERVER_NAME = packageJson.config.mcpServerName;
export const MCP_SERVER_VERSION = packageJson.version;
export const MCP_TRANSPORT =
  process.env.MCP_TRANSPORT?.toLowerCase().trim() || "stdio";
export const USER_AGENT = `${MCP_SERVER_NAME}/${MCP_SERVER_VERSION} ${MCP_TRANSPORT}`;
