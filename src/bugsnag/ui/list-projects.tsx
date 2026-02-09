import { App } from "@modelcontextprotocol/ext-apps";
import { createRoot } from "react-dom/client";
import "./list-projects.css";

const app = new App({
  name: "List Projects",
  version: "0.0.1",
});

const contentDiv = document.getElementById("container");
const reactRoot = createRoot(contentDiv!);

app.ontoolresult = (data) => {
  const projectData = data.content[0];
  if (projectData.type !== "text") {
    reactRoot.render(<div>Woops something went wrong...</div>);
    throw new Error(`Expected JSON content, but got ${projectData.type}`);
  }

  const projects = JSON.parse(projectData.text);

  reactRoot.render(
    <div>
      <ol>
        {projects.data.map((p) => (
          <li key={p.id}>{p.name}</li>
        ))}
      </ol>
    </div>,
  );
};

// Listen for incoming data from the MCP tool
app.ontoolinput = (data) => {
  console.log("Received data:", data);
};

// Signal that the app is ready
app.connect();
