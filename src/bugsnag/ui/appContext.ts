import type { App } from "@modelcontextprotocol/ext-apps";
import { createContext, useContext } from "react";

export const AppContext = createContext<App | undefined>(undefined);

export function useApp() {
  const app = useContext(AppContext);
  if (!app) {
    throw new Error("useApp must be used within an AppContext.Provider");
  }
  return app;
}
