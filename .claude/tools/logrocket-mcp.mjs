#!/usr/bin/env node
/**
 * LogRocket MCP Server
 *
 * A zero-dependency MCP server using only Node.js built-ins.
 * Implements MCP protocol (JSON-RPC 2.0 over stdio) directly.
 *
 * Tools Provided:
 * - logrocket_get_session_highlights: Get AI-generated summaries of user sessions with errors
 * - logrocket_export_sessions: Export raw session data with events, errors, network requests
 * - logrocket_update_user: Update user information and custom traits
 *
 * Requires LOGROCKET_API_KEY in .env.local or .claude/tools/.env.local
 * Format: LOGROCKET_API_KEY=org_id:app_id:secret_key
 */
/* global process */

import { existsSync, readFileSync } from "fs";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";
import { createInterface } from "readline";

const __toolsDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__toolsDir, "..", "..");

// Load environment variables
function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;
  const content = readFileSync(filePath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const match = trimmed.match(/^(LOGROCKET_[A-Z_]+)=(.+)$/);
    if (match) {
      let value = match[2].trim();
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      process.env[match[1]] = value;
    }
  }
}

loadEnvFile(join(projectRoot, ".env.local"));
loadEnvFile(join(__toolsDir, ".env.local"));

// Configuration
const API_KEY = process.env.LOGROCKET_API_KEY;
const API_BASE_URL = process.env.LOGROCKET_API_BASE_URL || "https://api.logrocket.com";

if (!API_KEY) {
  console.error("Error: Missing LOGROCKET_API_KEY");
  console.error("Please set LOGROCKET_API_KEY in .env.local or .claude/tools/.env.local");
  console.error("Format: LOGROCKET_API_KEY=org_id:app_id:secret_key");
  process.exit(1);
}

// Parse ORG_ID and APP_ID from API key (format: org_id:app_id:secret_key)
let ORG_ID, APP_ID;
const keyParts = API_KEY.split(':');
if (keyParts.length === 3) {
  [ORG_ID, APP_ID] = keyParts;
} else {
  ORG_ID = process.env.LOGROCKET_ORG_ID;
  APP_ID = process.env.LOGROCKET_APP_ID;

  if (!ORG_ID || !APP_ID) {
    console.error("Error: Invalid LOGROCKET_API_KEY format");
    console.error("Expected format: org_id:app_id:secret_key");
    process.exit(1);
  }
}

// API Helper
async function logRocketFetch(method, endpoint, body = null) {
  const url = `${API_BASE_URL}${endpoint}`;
  const options = {
    method,
    headers: {
      Authorization: `token ${API_KEY}`,
      "Content-Type": "application/json",
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`LogRocket API error (${response.status}): ${errorText}`);
  }

  const text = await response.text();

  if (!text || text.length === 0) {
    if (endpoint.includes('/data-export/')) {
      throw new Error(
        `Data Export API returned empty response. This API is deprecated for SaaS customers.`
      );
    }
    return {};
  }

  return JSON.parse(text);
}

// Tool definitions
const TOOLS = [
  {
    name: "logrocket_get_session_highlights",
    description: "Get AI-generated summaries of user sessions including errors and key interactions. Returns a request ID - the actual highlights will be delivered to the webhook URL you provide.",
    inputSchema: {
      type: "object",
      properties: {
        userID: {
          type: "string",
          description: "User identifier from LogRocket.identify() calls (provide either userID or userEmail)",
        },
        userEmail: {
          type: "string",
          description: "User email from LogRocket.identify() calls (provide either userID or userEmail)",
        },
        startMs: {
          type: "number",
          description: "Start time in milliseconds (Unix epoch) for session time range (optional)",
        },
        endMs: {
          type: "number",
          description: "End time in milliseconds (Unix epoch) for session time range (optional)",
        },
        webhookURL: {
          type: "string",
          description: "URL where LogRocket will POST the highlights results",
        },
      },
      required: ["webhookURL"],
    },
  },
  {
    name: "logrocket_export_sessions",
    description: "Export raw session data including events, errors, network requests, and metadata. WARNING: This API is deprecated for SaaS customers and may return empty results. Requires Data Export to be manually configured in LogRocket dashboard. Consider using the Streaming Data Export service instead. If available, returns URLs to JSON Lines files containing session data.",
    inputSchema: {
      type: "object",
      properties: {
        cursor: {
          type: "string",
          description: "Pagination cursor for retrieving newer sessions (from previous response)",
        },
        limit: {
          type: "number",
          description: "Number of sessions to return (default: 10, max: 100)",
        },
        date: {
          type: "number",
          description: "Unix timestamp in milliseconds to filter sessions from this date onwards",
        },
      },
    },
  },
  {
    name: "logrocket_update_user",
    description: "Update user information and custom traits in LogRocket. Useful for adding context about users that can help with debugging and support.",
    inputSchema: {
      type: "object",
      properties: {
        userId: {
          type: "string",
          description: "User ID to update",
        },
        name: {
          type: "string",
          description: "User's name (max 1,024 characters)",
        },
        email: {
          type: "string",
          description: "User's email address (max 1,024 characters)",
        },
        timestamp: {
          type: "number",
          description: "Unix timestamp in milliseconds for when data was recorded",
        },
        traits: {
          type: "object",
          description: "Custom key-value pairs describing the user (e.g., subscription tier, account type)",
        },
      },
      required: ["userId"],
    },
  },
];

// Tool handlers
async function handleTool(name, args) {
  switch (name) {
    case "logrocket_get_session_highlights": {
      const { userID, userEmail, startMs, endMs, webhookURL } = args;

      if (!userID && !userEmail) {
        throw new Error("Either userID or userEmail is required");
      }

      const requestBody = { webhookURL };
      if (userID) requestBody.userID = userID;
      if (userEmail) requestBody.userEmail = userEmail;
      if (startMs && endMs) {
        requestBody.timeRange = { startMs, endMs };
      }

      return await logRocketFetch(
        "POST",
        `/v1/orgs/${ORG_ID}/apps/${APP_ID}/highlights/`,
        requestBody
      );
    }

    case "logrocket_export_sessions": {
      const { cursor, limit, date } = args;

      const params = new URLSearchParams();
      if (cursor) params.append("cursor", cursor);
      if (limit) params.append("limit", limit.toString());
      if (date) params.append("date", date.toString());

      const queryString = params.toString();
      const endpoint = `/v1/orgs/${ORG_ID}/apps/${APP_ID}/data-export/${
        queryString ? `?${queryString}` : ""
      }`;

      return await logRocketFetch("GET", endpoint);
    }

    case "logrocket_update_user": {
      const { userId, name, email, timestamp, traits } = args;

      const requestBody = {};
      if (name) requestBody.name = name;
      if (email) requestBody.email = email;
      if (timestamp) requestBody.timestamp = timestamp;
      if (traits) requestBody.traits = traits;

      return await logRocketFetch(
        "PUT",
        `/v1/orgs/${ORG_ID}/apps/${APP_ID}/users/${userId}`,
        requestBody
      );
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// JSON-RPC response helpers
function jsonRpcResponse(id, result) {
  return JSON.stringify({ jsonrpc: "2.0", id, result });
}

function jsonRpcError(id, code, message) {
  return JSON.stringify({ jsonrpc: "2.0", id, error: { code, message } });
}

// Handle MCP protocol messages
async function handleMessage(message) {
  const { id, method, params } = message;

  try {
    switch (method) {
      case "initialize":
        return jsonRpcResponse(id, {
          protocolVersion: "2024-11-05",
          capabilities: { tools: {} },
          serverInfo: { name: "logrocket-mcp-server", version: "1.0.0" },
        });

      case "notifications/initialized":
        return null;

      case "tools/list":
        return jsonRpcResponse(id, { tools: TOOLS });

      case "tools/call": {
        const { name, arguments: args } = params;
        try {
          const result = await handleTool(name, args || {});
          return jsonRpcResponse(id, {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
          });
        } catch (error) {
          return jsonRpcResponse(id, {
            content: [{ type: "text", text: `Error: ${error.message}` }],
            isError: true,
          });
        }
      }

      default:
        return jsonRpcError(id, -32601, `Method not found: ${method}`);
    }
  } catch (error) {
    return jsonRpcError(id, -32603, error.message);
  }
}

// Main: Read JSON-RPC messages from stdin, write responses to stdout
const rl = createInterface({ input: process.stdin });

rl.on("line", async (line) => {
  if (!line.trim()) return;

  try {
    const message = JSON.parse(line);
    const response = await handleMessage(message);
    if (response) {
      process.stdout.write(response + "\n");
    }
  } catch (error) {
    const errorResponse = jsonRpcError(null, -32700, "Parse error");
    process.stdout.write(errorResponse + "\n");
  }
});

rl.on("close", () => process.exit(0));
