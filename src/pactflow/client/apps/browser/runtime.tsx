import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

type JsonRpcMessage = {
  jsonrpc?: string;
  id?: number;
  method?: string;
  params?: any;
  result?: any;
  error?: { message?: string };
};

export interface AppRuntime {
  result: any;
  toolInput: Record<string, unknown>;
  callTool: (arguments_: Record<string, unknown>) => Promise<any>;
}

const RuntimeContext = createContext<AppRuntime | null>(null);

export function useAppRuntime(): AppRuntime {
  const runtime = useContext(RuntimeContext);
  if (!runtime) throw new Error("MCP App runtime is unavailable");
  return runtime;
}

export function AppRuntimeProvider({
  name,
  children,
}: {
  name: string;
  children: React.ReactNode;
}) {
  const [result, setResult] = useState<any>();
  const [toolInput, setToolInput] = useState<Record<string, unknown>>({});
  const pending = useRef(
    new Map<
      number,
      { resolve: (value: any) => void; reject: (reason: Error) => void }
    >(),
  );
  const nextId = useRef(1);

  const post = useCallback(
    (message: JsonRpcMessage) =>
      window.parent.postMessage({ jsonrpc: "2.0", ...message }, "*"),
    [],
  );
  const notify = useCallback(
    (method: string, params: unknown) => post({ method, params }),
    [post],
  );
  const reportSize = useCallback(
    () =>
      notify("ui/notifications/size-changed", {
        width: Math.ceil(document.documentElement.scrollWidth),
        height: Math.ceil(document.documentElement.scrollHeight),
      }),
    [notify],
  );

  const request = useCallback(
    (method: string, params: unknown): Promise<any> => {
      const id = nextId.current++;
      post({ id, method, params });
      return new Promise((resolve, reject) =>
        pending.current.set(id, { resolve, reject }),
      );
    },
    [post],
  );

  useEffect(() => {
    const applyHostContext = (context: any) => {
      if (!context) return;
      if (context.theme) document.documentElement.dataset.theme = context.theme;
      for (const [key, value] of Object.entries(
        context.styles?.variables ?? {},
      )) {
        if (typeof value === "string")
          document.documentElement.style.setProperty(key, value);
      }
    };
    const onMessage = (event: MessageEvent<JsonRpcMessage>) => {
      if (event.source !== window.parent) return;
      const message = event.data;
      if (!message || typeof message !== "object" || message.jsonrpc !== "2.0")
        return;
      if (!message.method && message.id !== undefined) {
        const callback = pending.current.get(message.id);
        if (callback) {
          pending.current.delete(message.id);
          message.error
            ? callback.reject(
                new Error(message.error.message ?? "Request failed"),
              )
            : callback.resolve(message.result);
        }
        return;
      }
      if (message.method === "ui/notifications/tool-result")
        setResult(message.params);
      if (message.method === "ui/notifications/tool-input")
        setToolInput(message.params?.arguments ?? {});
      if (message.method === "ui/notifications/host-context-changed")
        applyHostContext(message.params);
      if (
        (message.method === "ping" ||
          message.method === "ui/resource-teardown") &&
        message.id !== undefined
      )
        post({ id: message.id, result: {} });
    };
    window.addEventListener("message", onMessage);
    const observer = new ResizeObserver(reportSize);
    observer.observe(document.body);
    request("ui/initialize", {
      protocolVersion: "2026-01-26",
      appInfo: { name, version: "1.0.0" },
      appCapabilities: { availableDisplayModes: ["inline", "fullscreen"] },
    })
      .then((response) => {
        applyHostContext(response?.hostContext);
        notify("ui/notifications/initialized", {});
        reportSize();
      })
      .catch(() => undefined);
    return () => {
      observer.disconnect();
      window.removeEventListener("message", onMessage);
    };
  }, [name, notify, post, reportSize, request]);

  return (
    <RuntimeContext.Provider
      value={{
        result,
        toolInput,
        callTool: (arguments_) =>
          request("tools/call", {
            name: result?._meta?.contractTesting?.tool?.name,
            arguments: arguments_,
          }),
      }}
    >
      {children}
    </RuntimeContext.Provider>
  );
}
