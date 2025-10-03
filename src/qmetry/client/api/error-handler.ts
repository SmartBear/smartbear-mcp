/**
 * QMetry API Error Handling Utilities
 *
 * This module provides centralized error handling for QMetry API operations,
 * including user-friendly error messages and troubleshooting guidance.
 *
 * Handles common error scenarios:
 * - SSL/TLS Certificate errors (corporate proxies like Zscaler)
 * - Authentication/Authorization failures
 * - CORS (Cross-Origin Resource Sharing) issues
 * - Project access errors
 * - Network connectivity problems
 * - Generic API errors with helpful troubleshooting
 */

export interface QMetryErrorContext {
  status: number;
  errorData?: any;
  errorText: string;
  baseUrl: string;
  project?: string;
  path?: string;
  isCorsError?: boolean;
}

/**
 * Error message templates for common QMetry API issues
 */
const ERROR_TEMPLATES = {
  AUTHENTICATION_FAILED: (baseUrl: string, errorText: string) =>
    `QMetry API Authentication Failed: Invalid or expired API key.\n\n` +
    `To resolve this issue:\n` +
    `1. Log into your QMetry Test Management instance: ${baseUrl}\n` +
    `2. Search Open API → Go To Open API Page\n` +
    `3. Generate a new API key OR copy an existing valid key\n` +
    `4. Copy the API key to your clipboard\n` +
    `5. Restart VS Code or reload the MCP server\n` +
    `6. When prompted, paste the new API key for 'QMetry Open API Key'\n\n` +
    `Note: API keys may expire or be revoked. Always use the latest key from your QMetry instance.\n` +
    `Original error: ${errorText}`,

  PROJECT_ACCESS_ERROR: (project: string, errorText: string) =>
    `QMetry Project Access Error: Cannot access project '${project}'.\n\n` +
    `Possible causes:\n` +
    `1. API key lacks permissions for this project\n` +
    `2. Project key '${project}' doesn't exist or is archived\n` +
    `3. Your user account doesn't have access to this project\n\n` +
    `To resolve:\n` +
    `1. Verify the project key is correct\n` +
    `2. Check your QMetry permissions for this project\n` +
    `3. Contact your QMetry administrator if needed\n\n` +
    `Original error: ${errorText}`,

  GENERIC_API_ERROR: (status: number, baseUrl: string, errorText: string) =>
    `QMetry API request failed (${status}): ${errorText}\n\n` +
    `Troubleshooting tips:\n` +
    `Verify your QMetry instance URL: ${baseUrl}\n` +
    `Check if your API key is valid and not expired\n` +
    `Ensure you have the necessary permissions\n` +
    `Try accessing QMetry directly in your browser to confirm connectivity`,

  CORS_ERROR: (baseUrl: string, errorText: string) =>
    `QMetry API CORS Error: Cross-Origin Request Blocked.\n\n` +
    `CORS (Cross-Origin Resource Sharing) issue detected:\n` +
    `Your browser is blocking the request due to CORS policy\n` +
    `The QMetry server may not be configured to allow requests from this origin\n\n` +
    `Possible solutions:\n` +
    `1. Contact your QMetry administrator to configure CORS headers\n` +
    `2. Ensure the QMetry instance URL is correct: ${baseUrl}\n` +
    `3. If using a proxy, verify proxy CORS configuration\n` +
    `4. Try accessing QMetry from the same domain/protocol\n` +
    `5. Check if browser extensions are blocking the request\n\n` +
    `Technical details: ${errorText}`,

  SSL_CERTIFICATE_ERROR: (baseUrl: string, errorText: string) =>
    `QMetry API SSL Certificate Error: Unable to verify certificate.\n\n` +
    `SSL/TLS Certificate verification failed - Common in corporate networks:\n` +
    `• Corporate proxy/firewall (Zscaler, Forcepoint, etc.) is intercepting HTTPS traffic\n` +
    `• Self-signed or corporate certificates are being used\n` +
    `• Certificate chain validation is failing\n\n` +
    `Solution for corporate network environments:\n` +
    `Contact your IT administrator to:\n` +
    `• Add QMetry domain to certificate bypass list\n` +
    `• Configure corporate certificates properly\n` +
    `• Whitelist the QMetry API endpoints\n` +
    `Target URL: ${baseUrl}\n` +
    `Technical details: ${errorText}`,
};

/**
 * Checks if the error is related to authentication/authorization
 */
function isAuthenticationError(context: QMetryErrorContext): boolean {
  const { status, errorData } = context;

  return (
    status === 401 ||
    status === 403 ||
    errorData?.code === "CO.INVALID_API_KEY" ||
    errorData?.message?.toLowerCase().includes("invalid api key")
  );
}

/**
 * Checks if the error is related to project access
 */
function isProjectAccessError(context: QMetryErrorContext): boolean {
  const { status, path } = context;
  return status === 404 && (path?.includes("project") ?? false);
}

/**
 * Checks if the error is related to CORS (Cross-Origin Resource Sharing)
 */
function isCorsError(context: QMetryErrorContext): boolean {
  const { status, errorText, isCorsError } = context;

  // Explicit CORS flag from fetch error
  if (isCorsError) {
    return true;
  }

  // Common CORS indicators
  const corsIndicators = [
    "cors",
    "cross-origin",
    "cross origin",
    "preflight",
    "access-control-allow-origin",
    "network error when attempting to fetch resource",
    "failed to fetch",
  ];

  const lowercaseErrorText = errorText.toLowerCase();

  // Status 0 often indicates CORS issues
  if (status === 0) {
    return true;
  }

  // Check error text for CORS-related keywords
  return corsIndicators.some((indicator) =>
    lowercaseErrorText.includes(indicator),
  );
}

/**
 * Checks if the error is related to SSL/TLS certificate issues
 */
function isSslCertificateError(context: QMetryErrorContext): boolean {
  const { errorText } = context;

  // Common SSL certificate error indicators
  const sslErrorIndicators = [
    "unable to get local issuer certificate",
    "unable_to_get_issuer_cert_locally",
    "self signed certificate",
    "certificate verify failed",
    "ssl certificate problem",
    "certificate has expired",
    "certificate authority is invalid",
    "untrusted certificate",
    "cert authority invalid",
    "tls certificate verification failed",
    "certificate validation error",
  ];

  const lowercaseErrorText = errorText.toLowerCase();

  // Check for specific error codes that indicate SSL issues
  if (
    lowercaseErrorText.includes("unable_to_get_issuer_cert_locally") ||
    lowercaseErrorText.includes("cert_untrusted") ||
    lowercaseErrorText.includes("cert_authority_invalid") ||
    lowercaseErrorText.includes("certificate verify failed")
  ) {
    return true;
  }

  // Check error text for SSL-related keywords
  return sslErrorIndicators.some((indicator) =>
    lowercaseErrorText.includes(indicator),
  );
}

/**
 * Creates an appropriate error message based on the error context
 */
export function createQMetryError(context: QMetryErrorContext): Error {
  const { status, errorText, baseUrl, project } = context;

  // SSL certificate errors should be checked first as they're network-level issues
  if (isSslCertificateError(context)) {
    return new Error(ERROR_TEMPLATES.SSL_CERTIFICATE_ERROR(baseUrl, errorText));
  }

  if (isCorsError(context)) {
    return new Error(ERROR_TEMPLATES.CORS_ERROR(baseUrl, errorText));
  }

  if (isAuthenticationError(context)) {
    return new Error(ERROR_TEMPLATES.AUTHENTICATION_FAILED(baseUrl, errorText));
  }

  if (isProjectAccessError(context) && project) {
    return new Error(ERROR_TEMPLATES.PROJECT_ACCESS_ERROR(project, errorText));
  }

  return new Error(
    ERROR_TEMPLATES.GENERIC_API_ERROR(status, baseUrl, errorText),
  );
}

/**
 * Handles QMetry API errors in a standardized way
 *
 * @param response - The failed HTTP response
 * @param baseUrl - The QMetry base URL
 * @param project - Optional project context
 * @param path - Optional API path context
 */
export async function handleQMetryApiError(
  response: Response,
  baseUrl: string,
  project?: string,
  path?: string,
): Promise<never> {
  let errorData: any;
  let errorText: string;

  try {
    errorData = await response.json();
    errorText = JSON.stringify(errorData);
  } catch {
    errorText = (await response.text()) || `HTTP ${response.status}`;
  }

  const context: QMetryErrorContext = {
    status: response.status,
    errorData,
    errorText,
    baseUrl,
    project,
    path,
  };

  throw createQMetryError(context);
}

/**
 * Handles fetch errors that occur before receiving a response (e.g., CORS, network issues)
 *
 * @param error - The fetch error
 * @param baseUrl - The QMetry base URL
 * @param project - Optional project context
 * @param path - Optional API path context
 */
export function handleQMetryFetchError(
  error: Error,
  baseUrl: string,
  project?: string,
  path?: string,
): never {
  // Extract comprehensive error information
  let errorText = error.message || error.toString();

  // Check if error has a cause property with more details (common for SSL errors)
  if (error.cause && typeof error.cause === "object") {
    const cause = error.cause as any;
    if (cause.message) {
      errorText += ` | Cause: ${cause.message}`;
    }
    if (cause.code) {
      errorText += ` | Code: ${cause.code}`;
    }
    // Add the full cause details for better debugging
    if (cause.toString && typeof cause.toString === "function") {
      errorText += ` | Details: ${cause.toString()}`;
    }
  }

  // Check for specific SSL error patterns in the full error
  const fullErrorString = JSON.stringify(
    error,
    Object.getOwnPropertyNames(error),
  );
  if (
    fullErrorString.includes("unable to get local issuer certificate") ||
    fullErrorString.includes("UNABLE_TO_GET_ISSUER_CERT_LOCALLY")
  ) {
    errorText +=
      " | SSL Certificate Error: Corporate proxy/firewall intercepting HTTPS";
  }

  // Check if this is an SSL certificate error first
  const tempContext = {
    status: 0,
    errorText,
    baseUrl,
    project,
    path,
  };
  const isSSLError = isSslCertificateError(tempContext);

  const context: QMetryErrorContext = {
    status: 0, // Status 0 typically indicates network/CORS/SSL issues
    errorText,
    baseUrl,
    project,
    path,
    // Only assume CORS if it's not an SSL error
    isCorsError: !isSSLError,
  };

  throw createQMetryError(context);
}
