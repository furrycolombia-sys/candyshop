#!/usr/bin/env node
/**
 * Lightweight Vercel MCP Server
 *
 * A zero-dependency MCP server using only Node.js built-ins.
 * Implements MCP protocol (JSON-RPC 2.0 over stdio) directly.
 *
 * Essential Tools Provided:
 * - vercel_list_deployments: List recent deployments
 * - vercel_get_deployment: Get deployment details and status
 * - vercel_get_deployment_events: Get build logs/events
 * - vercel_list_projects: List projects
 * - vercel_get_project: Get project details
 * - vercel_get_project_domains: Get domains for a project
 * - vercel_get_project_env: Get environment variable names
 * - vercel_cancel_deployment: Cancel a building deployment
 * - vercel_redeploy: Trigger a redeployment
 * - vercel_get_latest_deployment: Get latest deployment for a project
 *
 * Requires VERCEL_TOKEN in .env.local or .claude/tools/.env.local
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
    const match = trimmed.match(/^VERCEL_TOKEN=(.+)$/);
    if (match) {
      let token = match[1].trim();
      if ((token.startsWith('"') && token.endsWith('"')) ||
          (token.startsWith("'") && token.endsWith("'"))) {
        token = token.slice(1, -1);
      }
      process.env.VERCEL_TOKEN = token;
      break;
    }
  }
}

loadEnvFile(join(projectRoot, ".env.local"));
loadEnvFile(join(__toolsDir, ".env.local"));

const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
if (!VERCEL_TOKEN) {
  console.error("Error: VERCEL_TOKEN not found");
  process.exit(1);
}

const VERCEL_API = "https://api.vercel.com";

// API helper
async function vercelFetch(endpoint, options = {}) {
  const url = `${VERCEL_API}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${VERCEL_TOKEN}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Vercel API error (${response.status}): ${error}`);
  }

  return response.json();
}

// Tool definitions
const TOOLS = [
  {
    name: "vercel_list_deployments",
    description: "List recent deployments. Returns deployment ID, URL, state, and creation time.",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string", description: "Filter by project ID or name" },
        limit: { type: "number", description: "Number of deployments to return (default: 10, max: 100)" },
        state: { type: "string", enum: ["BUILDING", "ERROR", "INITIALIZING", "QUEUED", "READY", "CANCELED"], description: "Filter by deployment state" },
      },
    },
  },
  {
    name: "vercel_get_deployment",
    description: "Get details of a specific deployment by ID or URL. Includes status, build info, and errors.",
    inputSchema: {
      type: "object",
      properties: {
        idOrUrl: { type: "string", description: "Deployment ID or URL" },
      },
      required: ["idOrUrl"],
    },
  },
  {
    name: "vercel_get_deployment_events",
    description: "Get build logs and events for a deployment. Essential for debugging build failures.",
    inputSchema: {
      type: "object",
      properties: {
        idOrUrl: { type: "string", description: "Deployment ID or URL" },
        limit: { type: "number", description: "Number of events to return (default: 100)" },
        direction: { type: "string", enum: ["backward", "forward"], description: "Direction to fetch events" },
      },
      required: ["idOrUrl"],
    },
  },
  {
    name: "vercel_list_projects",
    description: "List all projects in the account.",
    inputSchema: {
      type: "object",
      properties: {
        search: { type: "string", description: "Search projects by name" },
        limit: { type: "number", description: "Number of projects to return (default: 20)" },
      },
    },
  },
  {
    name: "vercel_get_project",
    description: "Get details of a specific project including settings, domains, and environment info.",
    inputSchema: {
      type: "object",
      properties: {
        idOrName: { type: "string", description: "Project ID or name" },
      },
      required: ["idOrName"],
    },
  },
  {
    name: "vercel_get_project_domains",
    description: "Get all domains configured for a project.",
    inputSchema: {
      type: "object",
      properties: {
        idOrName: { type: "string", description: "Project ID or name" },
      },
      required: ["idOrName"],
    },
  },
  {
    name: "vercel_get_project_env",
    description: "Get environment variables for a project (names only, not values for security).",
    inputSchema: {
      type: "object",
      properties: {
        idOrName: { type: "string", description: "Project ID or name" },
        target: { type: "string", enum: ["production", "preview", "development"], description: "Environment target" },
      },
      required: ["idOrName"],
    },
  },
  {
    name: "vercel_cancel_deployment",
    description: "Cancel a deployment that is currently building.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Deployment ID to cancel" },
      },
      required: ["id"],
    },
  },
  {
    name: "vercel_redeploy",
    description: "Trigger a redeployment of an existing deployment.",
    inputSchema: {
      type: "object",
      properties: {
        deploymentId: { type: "string", description: "Deployment ID to redeploy" },
        target: { type: "string", enum: ["production", "preview"], description: "Deployment target" },
      },
      required: ["deploymentId"],
    },
  },
  {
    name: "vercel_get_latest_deployment",
    description: "Get the latest deployment for a project (convenience wrapper).",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string", description: "Project ID or name" },
        target: { type: "string", enum: ["production", "preview"], description: "Filter by target (optional)" },
      },
      required: ["projectId"],
    },
  },
];

// Tool handlers
async function handleTool(name, args) {
  switch (name) {
    case "vercel_list_deployments": {
      const params = new URLSearchParams();
      if (args.projectId) params.set("projectId", args.projectId);
      if (args.limit) params.set("limit", String(args.limit));
      if (args.state) params.set("state", args.state);
      const data = await vercelFetch(`/v6/deployments?${params}`);
      return data.deployments.map(d => ({
        id: d.uid,
        url: d.url,
        state: d.state || d.readyState,
        target: d.target,
        createdAt: d.createdAt,
        name: d.name,
        meta: d.meta?.githubCommitMessage || d.meta?.gitlabCommitMessage,
      }));
    }

    case "vercel_get_deployment": {
      const data = await vercelFetch(`/v13/deployments/${args.idOrUrl}`);
      return {
        id: data.id,
        url: data.url,
        state: data.readyState,
        target: data.target,
        createdAt: data.createdAt,
        buildingAt: data.buildingAt,
        ready: data.ready,
        errorCode: data.errorCode,
        errorMessage: data.errorMessage,
        meta: {
          githubCommitRef: data.meta?.githubCommitRef,
          githubCommitMessage: data.meta?.githubCommitMessage,
          githubCommitAuthorName: data.meta?.githubCommitAuthorName,
        },
      };
    }

    case "vercel_get_deployment_events": {
      const params = new URLSearchParams();
      if (args.limit) params.set("limit", String(args.limit));
      if (args.direction) params.set("direction", args.direction);
      const data = await vercelFetch(`/v3/deployments/${args.idOrUrl}/events?${params}`);
      return data.filter(e =>
        e.type === "stdout" ||
        e.type === "stderr" ||
        e.type === "error" ||
        e.type === "command" ||
        e.type === "exit"
      ).map(e => ({
        type: e.type,
        created: e.created,
        text: e.text || e.payload?.text,
      }));
    }

    case "vercel_list_projects": {
      const params = new URLSearchParams();
      if (args.search) params.set("search", args.search);
      if (args.limit) params.set("limit", String(args.limit));
      const data = await vercelFetch(`/v9/projects?${params}`);
      return data.projects.map(p => ({
        id: p.id,
        name: p.name,
        framework: p.framework,
        updatedAt: p.updatedAt,
        latestDeployments: p.latestDeployments?.map(d => ({
          id: d.id,
          state: d.readyState,
          target: d.target,
        })),
      }));
    }

    case "vercel_get_project": {
      const data = await vercelFetch(`/v9/projects/${args.idOrName}`);
      return {
        id: data.id,
        name: data.name,
        framework: data.framework,
        nodeVersion: data.nodeVersion,
        buildCommand: data.buildCommand,
        devCommand: data.devCommand,
        installCommand: data.installCommand,
        outputDirectory: data.outputDirectory,
        rootDirectory: data.rootDirectory,
        updatedAt: data.updatedAt,
      };
    }

    case "vercel_get_project_domains": {
      const data = await vercelFetch(`/v9/projects/${args.idOrName}/domains`);
      return data.domains.map(d => ({
        name: d.name,
        verified: d.verified,
        gitBranch: d.gitBranch,
        redirect: d.redirect,
      }));
    }

    case "vercel_get_project_env": {
      const params = new URLSearchParams();
      if (args.target) params.set("target", args.target);
      const data = await vercelFetch(`/v10/projects/${args.idOrName}/env?${params}`);
      return data.envs.map(e => ({
        key: e.key,
        target: e.target,
        type: e.type,
        gitBranch: e.gitBranch,
      }));
    }

    case "vercel_cancel_deployment": {
      const data = await vercelFetch(`/v12/deployments/${args.id}/cancel`, {
        method: "PATCH",
      });
      return { id: data.id, state: data.readyState };
    }

    case "vercel_redeploy": {
      const body = { deploymentId: args.deploymentId };
      if (args.target) body.target = args.target;
      const data = await vercelFetch(`/v13/deployments`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      return { id: data.id, url: data.url, state: data.readyState };
    }

    case "vercel_get_latest_deployment": {
      const params = new URLSearchParams();
      params.set("projectId", args.projectId);
      params.set("limit", "1");
      if (args.target) params.set("target", args.target);
      const data = await vercelFetch(`/v6/deployments?${params}`);
      if (!data.deployments?.length) {
        return { error: "No deployments found" };
      }
      const d = data.deployments[0];
      return {
        id: d.uid,
        url: d.url,
        state: d.state || d.readyState,
        target: d.target,
        createdAt: d.createdAt,
        meta: d.meta?.githubCommitMessage,
      };
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
          serverInfo: { name: "vercel-lite", version: "1.0.0" },
        });

      case "notifications/initialized":
        return null; // No response needed for notifications

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
