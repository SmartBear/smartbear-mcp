import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { Suspense, use, useMemo, useState } from "react";
import { getToolResult } from "../../commonUi/util";
import type { ErrorApiView, Project } from "../client/api";
import "./ListProjects.css";
import { useApp } from "./AppContext";

export default function ListProjects(props: { data: CallToolResult }) {
  const { data } = props;

  const projects = useMemo(
    () => getToolResult<{ data: Project[]; count: number }>(data),
    [data],
  );

  const [searchTerm, setSearchTerm] = useState("");

  return (
    <div className="list-projects">
      <input
        name="search"
        type="text"
        placeholder="Search"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
      <ul className="project-list">
        {projects.data
          .filter((p) =>
            p.name
              ?.toLocaleLowerCase()
              .includes(searchTerm.toLocaleLowerCase()),
          )
          .map((p) => (
            <ProjectListItem key={p.id} project={p} />
          ))}
      </ul>
    </div>
  );
}

interface ErrorResult {
  data: ErrorApiView[];
  next_url?: string;
  data_count?: number;
  total_count?: number;
}

function ProjectListItem(props: { project: Project }) {
  const { id, name } = props.project;

  const app = useApp();
  const [projectErrorsResource, setProjectErrorsResource] =
    useState<Promise<ErrorResult>>();

  /**
   * When expanded, load the top project errors
   * When collapsed, clear the errors
   */
  const handleToggle = (event: React.ToggleEvent) => {
    if (event.newState === "open") {
      setProjectErrorsResource(
        app
          .callServerTool({
            name: "bugsnag_list_project_errors",
            arguments: { projectId: id },
          })
          .then((result) => getToolResult(result)),
      );
    } else {
      setProjectErrorsResource(undefined);
    }
  };

  return (
    <li>
      <details onToggle={handleToggle}>
        <summary>{name}</summary>
        <Suspense fallback={<div className="message">Loading...</div>}>
          {projectErrorsResource && (
            <ProjectErrors resource={projectErrorsResource} />
          )}
        </Suspense>
      </details>
    </li>
  );
}

function ProjectErrors(props: { resource: Promise<ErrorResult> }) {
  const errors = use(props.resource).data;

  if (errors.length === 0) {
    return <div className="message">No errors found for this project.</div>;
  }

  return (
    <ul className="error-list">
      {errors.map((e) => (
        <li key={e.id}>
          <div className="error-header">
            {e.error_class}&ensp;{e.context}
          </div>
          <div className="error-message">{e.message}</div>
        </li>
      ))}
    </ul>
  );
}
