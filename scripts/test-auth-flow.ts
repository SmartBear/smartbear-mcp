import { spawn } from "child_process";
import { OAuthService } from "../src/bugsnag/oauth";

const MOCK_SERVER_PORT = 3001;
const CLIENT_PORT = 8999;
const AUTHORITY_URL = `http://localhost:${MOCK_SERVER_PORT}`;
const REDIRECT_URI = `http://localhost:${CLIENT_PORT}/callback`;

async function runTest() {
  console.log("Starting Mock OAuth Server...");
  const mockServer = spawn("node", ["scripts/mock-oauth-server.cjs"], {
    stdio: "inherit",
  });

  // Wait for mock server to be ready
  await new Promise((resolve) => setTimeout(resolve, 1000));

  console.log("Starting Auth Flow...");
  try {
    const tokenPromise = OAuthService.startAuthCodeFlow(
      AUTHORITY_URL,
      "test-client-id",
      REDIRECT_URI,
      "api",
      async (url) => {
        console.log(`[Test] Received auth URL: ${url}`);
        console.log("[Test] Simulating browser visit...");

        // Simulate visiting the URL
        // We need to fetch it and follow redirects
        try {
          const res = await fetch(url);
          console.log(`[Test] Browser visited URL, status: ${res.status}`);
          const text = await res.text();
          if (text.includes("Authorization Successful")) {
            console.log("[Test] Browser saw success message.");
          } else {
            console.error("[Test] Browser did NOT see success message:", text);
          }
        } catch (e) {
          console.error("[Test] Error visiting URL:", e);
        }
      },
    );

    const token = await tokenPromise;
    console.log("Auth Flow Complete!");
    console.log("Received Token:", token);

    if (
      token.access_token &&
      token.access_token.startsWith("mock-access-token")
    ) {
      console.log("SUCCESS: Token looks valid.");
    } else {
      console.error("FAILURE: Token is invalid.");
      process.exit(1);
    }
  } catch (error) {
    console.error("Auth Flow Failed:", error);
    process.exit(1);
  } finally {
    mockServer.kill();
    process.exit(0);
  }
}

runTest();
