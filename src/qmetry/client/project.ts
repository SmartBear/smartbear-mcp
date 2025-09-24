import { qmetryRequest } from "./api/client-api.js";
import { QMETRY_PATHS } from "../config/rest-endpoints.js";
import { QMETRY_DEFAULTS } from "../config/constants.js";

export async function setProjectInfo(
  token: string,
  baseUrl: string,
  project?: string
) {
  return qmetryRequest({
    method: "GET",
    path: QMETRY_PATHS.PROJECT.GET_INFO,
    token,
    baseUrl: baseUrl || QMETRY_DEFAULTS.BASE_URL,
    project: project || QMETRY_DEFAULTS.PROJECT_KEY,
  });
}

export async function getProjectInfo(
  token: string,
  baseUrl: string,
  project?: string
) {
  return qmetryRequest({
    method: "GET",
    path: QMETRY_PATHS.PROJECT.GET_INFO,
    token,
    baseUrl: baseUrl || QMETRY_DEFAULTS.BASE_URL,
    project: project || QMETRY_DEFAULTS.PROJECT_KEY,
  });
}
