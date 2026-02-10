# MCP App POC

See https://modelcontextprotocol.io/docs/extensions/apps

When running the MCP server locally from the built dist dir. The app will be served by the MCP server.
The HTML file is read directly once and cached and assets are served from /assets.

### Local development
To improve the development experience, you can run the vite dev server, and start the MCP server with UI_DEV=true.
This will cause the MCP server to proxy the html from the dev server and the dev server will handle the assets.
This allows hot reloading to work and a far better experience.

```
$ UI_DEV=1 node dist/server.js
```

To use the basic-host app for testing, see https://modelcontextprotocol.io/docs/extensions/apps#testing-with-the-basic-host.

```
$ SERVERS='["http://localhost:3000/mcp"]' npm start
```
