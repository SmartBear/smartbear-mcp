const http = require("http");
const crypto = require("crypto");
const url = require("url");

const PORT = 3001;
const AUTH_CODES = new Map(); // Store codes and their associated challenges

// Helper to calculate S256 challenge from verifier
function calculateS256(verifier) {
  const hash = crypto.createHash("sha256").update(verifier).digest();
  return hash
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

const server = http.createServer((req, res) => {
  const reqUrl = new URL(req.url, `http://localhost:${PORT}`);
  console.log(`[MockServer] ${req.method} ${reqUrl.pathname}`);

  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === "GET" && reqUrl.pathname === "/authorize") {
    const clientId = reqUrl.searchParams.get("client_id");
    const redirectUri = reqUrl.searchParams.get("redirect_uri");
    const responseType = reqUrl.searchParams.get("response_type");
    const codeChallenge = reqUrl.searchParams.get("code_challenge");
    const codeChallengeMethod = reqUrl.searchParams.get(
      "code_challenge_method",
    );
    const state = reqUrl.searchParams.get("state");

    if (responseType !== "code") {
      res.writeHead(400);
      res.end("Invalid response_type");
      return;
    }

    if (codeChallengeMethod !== "S256") {
      res.writeHead(400);
      res.end("Invalid code_challenge_method, expected S256");
      return;
    }

    if (!codeChallenge) {
      res.writeHead(400);
      res.end("Missing code_challenge");
      return;
    }

    // Generate a mock auth code
    const code = crypto.randomBytes(16).toString("hex");
    AUTH_CODES.set(code, {
      challenge: codeChallenge,
      clientId,
      redirectUri,
    });

    console.log(
      `[MockServer] Generated code: ${code} for challenge: ${codeChallenge}`,
    );

    // Redirect back to the client's redirect_uri
    const callbackUrl = new URL(redirectUri);
    callbackUrl.searchParams.append("code", code);
    if (state) {
      callbackUrl.searchParams.append("state", state);
    }

    res.writeHead(302, { Location: callbackUrl.toString() });
    res.end();
    return;
  }

  if (req.method === "POST" && reqUrl.pathname === "/token") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });

    req.on("end", () => {
      try {
        let params;
        if (req.headers["content-type"] === "application/json") {
          params = JSON.parse(body);
        } else {
          // Fallback or error if strict
          params = Object.fromEntries(new URLSearchParams(body));
        }

        const { grant_type, code, client_id, redirect_uri, code_verifier } =
          params;

        console.log("[MockServer] Token request params:", params);

        if (grant_type !== "authorization_code") {
          res.writeHead(400);
          res.end(JSON.stringify({ error: "invalid_grant" }));
          return;
        }

        const authData = AUTH_CODES.get(code);
        if (!authData) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: "invalid_code" }));
          return;
        }

        if (authData.clientId !== client_id) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: "invalid_client" }));
          return;
        }

        // Verify PKCE
        const calculatedChallenge = calculateS256(code_verifier);
        console.log(
          `[MockServer] Verifying PKCE. \nStored Challenge: ${authData.challenge}\nCalculated from Verifier: ${calculatedChallenge}`,
        );

        if (calculatedChallenge !== authData.challenge) {
          res.writeHead(400);
          res.end(
            JSON.stringify({
              error: "invalid_grant",
              error_description: "PKCE verification failed",
            }),
          );
          return;
        }

        // Success!
        const tokenResponse = {
          access_token:
            "mock-access-token-" + crypto.randomBytes(8).toString("hex"),
          token_type: "Bearer",
          expires_in: 3600,
          refresh_token:
            "mock-refresh-token-" + crypto.randomBytes(8).toString("hex"),
          scope: "api",
        };

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(tokenResponse));
      } catch (err) {
        console.error("[MockServer] Error processing token request:", err);
        res.writeHead(500);
        res.end("Internal Server Error");
      }
    });
    return;
  }

  res.writeHead(404);
  res.end("Not Found");
});

server.listen(PORT, () => {
  console.log(`Mock OAuth Server running at http://localhost:${PORT}`);
});
