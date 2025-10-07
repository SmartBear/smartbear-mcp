export const QMETRY_PATHS = {
  PROJECT: {
    GET_INFO: "/rest/admin/project/getinfo",
    GET_RELEASES_CYCLES: "/rest/admin/scope/tree",
    GET_BUILD: "/rest/admin/drop/list",
    GET_PLATFORMS: "/rest/admin/platform/list",
  },
  TESTCASE: {
    GET_TC_LIST: "/rest/testcases/list/viewColumns",
    GET_TC_DETAILS: "/rest/testcases/getVersionDetail",
    GET_TC_DETAILS_BY_VERSION: "/rest/testcases/list",
    GET_TC_STEPS: "/rest/testcases/steps/list",
    GET_TC_LINKED_TO_RQ: "/rest/testcases/list/forRQ",
  },
  REQUIREMENT: {
    GET_RQ_LIST: "/rest/requirements/list/viewColumns",
    GET_RQ_DETAILS: "/rest/requirements/detail/data",
  },
};
