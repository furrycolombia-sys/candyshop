#!/usr/bin/env node
/**
 * GitHub Webhook Deploy Receiver
 * Listens for push events on main branch and triggers deployment.
 * Runs on the server via PM2 on port 9091.
 *
 * Setup:
 *   1. Add WEBHOOK_SECRET to GitHub repo settings (Settings → Webhooks)
 *   2. Set payload URL to https://ssh.furrycolombia.com:9091/deploy (or via tunnel)
 *   3. Content type: application/json
 *   4. Select "Just the push event"
 */

import { createServer } from "node:http";
import { createHmac } from "node:crypto";
import { execFile } from "node:child_process";
import { readFileSync } from "node:fs";

const PORT = process.env.WEBHOOK_PORT || 9091;
const SECRET = process.env.WEBHOOK_SECRET || "";
const DEPLOY_SCRIPT =
  process.env.DEPLOY_SCRIPT || "/home/furrycolombia/deploy.sh";
const BRANCH = process.env.DEPLOY_BRANCH || "main";

let deploying = false;

function log(msg) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

function verifySignature(payload, signature) {
  if (!SECRET) return true; // no secret = skip verification (dev mode)
  if (!signature) return false;
  const hmac = createHmac("sha256", SECRET);
  hmac.update(payload);
  const expected = `sha256=${hmac.digest("hex")}`;
  return signature === expected;
}

function runDeploy() {
  if (deploying) {
    log("Deploy already in progress, skipping");
    return;
  }
  deploying = true;
  log("Starting deployment...");

  execFile(
    "bash",
    [DEPLOY_SCRIPT],
    {
      env: {
        ...process.env,
        BRANCH,
        REPO_URL: "https://github.com/furrycolombia-sys/candyshop.git",
        ENV_FILE: "/home/furrycolombia/candyshop-build.env",
      },
      timeout: 15 * 60 * 1000, // 15 min max
      maxBuffer: 10 * 1024 * 1024,
    },
    (err, stdout, stderr) => {
      deploying = false;
      if (err) {
        log(`Deploy FAILED: ${err.message}`);
        if (stderr) log(`stderr: ${stderr.slice(-500)}`);
      } else {
        log("Deploy completed successfully");
      }
      if (stdout) log(`stdout (last 500): ${stdout.slice(-500)}`);
    },
  );
}

const server = createServer((req, res) => {
  // Health check
  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end(`OK | deploying=${deploying}`);
    return;
  }

  // Deploy endpoint
  if (req.method === "POST" && req.url === "/deploy") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      const signature = req.headers["x-hub-signature-256"];

      if (!verifySignature(body, signature)) {
        log("Invalid signature — rejected");
        res.writeHead(403);
        res.end("Forbidden");
        return;
      }

      let payload;
      try {
        payload = JSON.parse(body);
      } catch {
        res.writeHead(400);
        res.end("Bad JSON");
        return;
      }

      // Only deploy on push to the target branch
      const ref = payload.ref || "";
      if (ref !== `refs/heads/${BRANCH}`) {
        log(`Ignoring push to ${ref} (watching ${BRANCH})`);
        res.writeHead(200);
        res.end("Ignored");
        return;
      }

      log(
        `Push to ${BRANCH} by ${payload.pusher?.name || "unknown"}: ${payload.head_commit?.message || "no message"}`,
      );
      runDeploy();

      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end("Deploy triggered");
    });
    return;
  }

  res.writeHead(404);
  res.end("Not found");
});

server.listen(PORT, "0.0.0.0", () => {
  log(`Webhook receiver listening on port ${PORT}`);
  log(`Deploy branch: ${BRANCH}`);
  log(`Deploy script: ${DEPLOY_SCRIPT}`);
  log(`Signature verification: ${SECRET ? "enabled" : "DISABLED (no secret)"}`);
});
