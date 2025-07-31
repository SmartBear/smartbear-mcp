import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
    const didChangeEmitter = new vscode.EventEmitter<void>();

    async function inputPrompt(prompt: string, key: string) {
        const value = await vscode.window.showInputBox({
            prompt: prompt,
            ignoreFocusOut: true
        });
		if (value === undefined) {
			return {};
		} else {
			return { [key]: value };
		}
    }

    context.subscriptions.push(vscode.lm.registerMcpServerDefinitionProvider('smartbear-mcp', {
        onDidChangeMcpServerDefinitions: didChangeEmitter.event,
		provideMcpServerDefinitions: async () => {
            let servers: vscode.McpServerDefinition[] = [];

            servers.push(new vscode.McpStdioServerDefinition(
				'smartbear-mcp',
				'npx',
				['-y', '@smartbear/mcp@latest']));

            return servers;
        },
        resolveMcpServerDefinition: async (server: vscode.McpServerDefinition) => {

            if (server.label === 'smartbear-mcp') {
				const stdioServer = server as vscode.McpStdioServerDefinition;
				stdioServer.env = {
					...stdioServer.env,
					...await inputPrompt('Enter your Insight Hub Auth Token', 'INSIGHT_HUB_AUTH_TOKEN'),
					...await inputPrompt('Insight Hub Project API Key - for single project interactions', 'INSIGHT_HUB_PROJECT_API_KEY'),
					...await inputPrompt('Reflect API Token - leave blank to disable Reflect tools', 'REFLECT_API_TOKEN'),
					...await inputPrompt('API Hub API Key - leave blank to disable API Hub tools', 'API_HUB_API_KEY'),
				};
            }

            return server;
        }
    }));
}
