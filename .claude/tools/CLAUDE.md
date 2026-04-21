# MCP Server Development Guide (Zero-Dependency)

This guide explains how to create new MCP (Model Context Protocol) servers for Claude Code integration.

## Overview

MCP servers in this directory provide tools that Claude can use during development. Each server is a **single `.mjs` file** that is **completely self-contained** with **zero external dependencies**.

**Key Principle**: All MCP servers use only Node.js built-in modules (`fs`, `path`, `readline`, native `fetch`). No npm packages required. No `node_modules` folder. No installation needed.

## File Structure

```
.claude/tools/
├── .env.local              # API tokens and credentials (gitignored)
├── .env.local.example      # Template for credentials
├── github-unified-mcp.mjs  # GitHub API integration (zero-dependency)
├── vercel-lite-mcp.mjs     # Vercel API integration (zero-dependency)
├── logrocket-mcp.mjs       # LogRocket session replay (zero-dependency)
├── linear-mcp.mjs          # Linear issue tracking (zero-dependency)
├── CLAUDE.md               # This file
└── README.md               # General MCP server information
```

## MCP Server Pattern

All MCP servers in this directory follow the same structure:

### 1. File Header

```javascript
#!/usr/bin/env node
/**
 * [Name] MCP Server
 *
 * [Brief description of what this server does]
 *
 * Tools Provided:
 * - tool_name_1: Description
 * - tool_name_2: Description
 * - tool_name_3: Description
 *
 * Requires [ENV_VAR_1], [ENV_VAR_2]
 * in .env.local or .claude/tools/.env.local
 */
/* global process */
```

### 2. Imports (Built-ins Only)

```javascript
// ONLY use Node.js built-in modules - no npm packages!
import { existsSync, readFileSync } from "fs";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";
import { createInterface } from "readline";
// Native fetch is available in Node 18+
```

### 3. Environment Variable Loading

Use this standard pattern to load `.env.local` files:

```javascript
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..", "..");

// Load environment variables
function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    // Match your specific env var pattern
    const match = trimmed.match(/^(YOUR_PREFIX_[A-Z_]+)=(.+)$/);
    if (match) {
      let value = match[2].trim();
      // Handle quoted values
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      process.env[match[1]] = value;
    }
  }
}

// Load from both project root and tools directory
loadEnvFile(path.join(projectRoot, ".env.local"));
loadEnvFile(path.join(__dirname, ".env.local"));

// Validate required variables
const API_KEY = process.env.YOUR_API_KEY;
if (!API_KEY) {
  console.error("Error: YOUR_API_KEY not found");
  console.error("Please set it in .env.local or .claude/tools/.env.local");
  process.exit(1);
}
```

**Key points:**

- Check both project root and `.claude/tools/` for `.env.local`
- Handle both quoted and unquoted values
- Exit with clear error messages if credentials are missing
- Use regex to match specific variable patterns

### 4. API Helper Function

Create a reusable function for API calls:

```javascript
async function apiFetch(method, endpoint, body = null) {
  const url = `${API_BASE_URL}${endpoint}`;
  const options = {
    method,
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API error (${response.status}): ${errorText}`);
  }

  return response.json();
}
```

### 5. Tool Definitions

Define tools as an array following MCP schema:

```javascript
const TOOLS = [
  {
    name: "tool_name",
    description:
      "Clear, concise description of what this tool does. Be specific about what it returns.",
    inputSchema: {
      type: "object",
      properties: {
        paramName: {
          type: "string", // or "number", "boolean", "object"
          description: "What this parameter is for",
        },
        optionalParam: {
          type: "number",
          description: "Optional parameter (omit from required array)",
        },
      },
      required: ["paramName"], // List required parameters
    },
  },
  // ... more tools
];
```

**Tool naming conventions:**

- Use `service_action` format (e.g., `github_create_issue`, `vercel_get_deployment`)
- Be descriptive and consistent
- Group related tools with the same prefix

### 6. JSON-RPC Helpers (Zero-Dependency)

Instead of using the MCP SDK, implement JSON-RPC 2.0 directly:

```javascript
// JSON-RPC response helpers
function jsonRpcResponse(id, result) {
  return JSON.stringify({ jsonrpc: "2.0", id, result });
}

function jsonRpcError(id, code, message) {
  return JSON.stringify({ jsonrpc: "2.0", id, error: { code, message } });
}
```

### 7. Message Handler (Zero-Dependency)

```javascript
// Handle MCP protocol messages
async function handleMessage(message) {
  const { id, method, params } = message;

  try {
    switch (method) {
      case "initialize":
        return jsonRpcResponse(id, {
          protocolVersion: "2024-11-05",
          capabilities: { tools: {} },
          serverInfo: { name: "your-mcp-server", version: "1.0.0" },
        });

      case "notifications/initialized":
        return null; // No response needed

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
```

### 8. Tool Handler

```javascript
async function handleTool(name, args) {
  switch (name) {
    case "tool_name": {
      const { paramName, optionalParam } = args;

      if (!paramName) {
        throw new Error("paramName is required");
      }

      const result = await apiFetch("GET", `/endpoint/${paramName}`);
      return result;
    }

    // ... more cases

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
```

### 9. Main: stdio Loop (Zero-Dependency)

```javascript
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
```

**Key points:**

- Uses `readline.createInterface` to read line-by-line from stdin
- Parses each line as JSON-RPC message
- Writes JSON-RPC response to stdout with newline
- No external dependencies!

## Configuration Files

### .mcp.json (Project Root)

Add your server to `.mcp.json`:

```json
{
  "mcpServers": {
    "your-service": {
      "command": "node",
      "args": [".claude/tools/your-service-mcp.mjs"],
      "env": {},
      "_note": "Brief description of what this MCP provides"
    }
  }
}
```

### .env.local.example

Update `.claude/tools/.env.local.example` with your new credentials:

```bash
# Your Service API Credentials
# Get your API key from: [URL to get credentials]
# Additional instructions if needed
YOUR_API_KEY=YOUR_API_KEY_HERE
YOUR_OTHER_VAR=YOUR_VALUE_HERE
```

## Development Workflow

### 1. Research the API

- Find official API documentation
- Identify authentication method (Bearer token, API key, OAuth, etc.)
- List available endpoints and their capabilities
- Note rate limits and restrictions

### 2. Design Your Tools

- Choose 3-10 most useful operations (avoid creating 100+ tools)
- Name tools consistently with `service_action` pattern
- Write clear descriptions focusing on "what" not "how"
- Define input schemas with helpful descriptions

### 3. Create the MCP File

```bash
# Create the file
touch .claude/tools/your-service-mcp.mjs
chmod +x .claude/tools/your-service-mcp.mjs
```

Follow the pattern outlined above.

### 4. Add Environment Variables

```bash
# Edit .env.local.example
nano .claude/tools/.env.local.example

# Add your actual credentials to .env.local
nano .claude/tools/.env.local
```

### 5. Configure MCP

```bash
# Edit .mcp.json in project root
nano .mcp.json
```

### 6. Test the Server

```bash
# Test directly
node .claude/tools/your-service-mcp.mjs

# Or restart Claude Code and ask it to list tools
```

## Best Practices

### Tool Design

1. **Keep it focused**: 3-10 tools is ideal. More tools = more context used per request
2. **Clear descriptions**: Users should know exactly what a tool does without reading code
3. **Predictable naming**: Use `service_action` format consistently
4. **Required vs optional**: Mark parameters correctly in the schema

### Error Messages

Good error messages:

```javascript
throw new Error("API key not found. Set GITHUB_TOKEN in .env.local");
throw new Error("Issue #123 not found in repository owner/repo");
throw new Error("Deployment failed: invalid project ID");
```

Bad error messages:

```javascript
throw new Error("Error"); // Too vague
throw new Error(JSON.stringify(apiError)); // Not human-readable
throw new Error("Failed"); // No context
```

### Response Format

Always return JSON for structured data:

```javascript
return {
  content: [
    {
      type: "text",
      text: JSON.stringify(result, null, 2), // Pretty-print JSON
    },
  ],
};
```

For simple confirmations, plain text is fine:

```javascript
return {
  content: [
    {
      type: "text",
      text: "Successfully updated user preferences",
    },
  ],
};
```

### Security

1. **Never commit credentials**: Use `.env.local` (already gitignored)
2. **Validate inputs**: Check required parameters before API calls
3. **Handle sensitive data**: Don't log API keys or tokens
4. **Use HTTPS**: Always use secure API endpoints

### File Size

- Target: 200-400 lines
- Maximum: ~500 lines
- If larger, consider splitting into multiple MCP servers

## Examples

### Minimal Example (Zero-Dependency)

```javascript
#!/usr/bin/env node
import { existsSync, readFileSync } from "fs";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";
import { createInterface } from "readline";

const __toolsDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__toolsDir, "..", "..");

// Load API key from .env.local
function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;
  const content = readFileSync(filePath, "utf-8");
  for (const line of content.split("\n")) {
    const match = line.trim().match(/^MY_API_KEY=(.+)$/);
    if (match) {
      process.env.MY_API_KEY = match[1].replace(/^["']|["']$/g, "");
      break;
    }
  }
}

loadEnvFile(join(projectRoot, ".env.local"));
loadEnvFile(join(__toolsDir, ".env.local"));

const API_KEY = process.env.MY_API_KEY;
if (!API_KEY) {
  console.error("Error: MY_API_KEY not found");
  process.exit(1);
}

const TOOLS = [
  {
    name: "my_get_data",
    description: "Fetch data from the API",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string", description: "Data ID" } },
      required: ["id"],
    },
  },
];

async function handleTool(name, args) {
  if (name === "my_get_data") {
    const response = await fetch(`https://api.example.com/data/${args.id}`, {
      headers: { Authorization: `Bearer ${API_KEY}` },
    });
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return await response.json();
  }
  throw new Error(`Unknown tool: ${name}`);
}

function jsonRpcResponse(id, result) {
  return JSON.stringify({ jsonrpc: "2.0", id, result });
}

function jsonRpcError(id, code, message) {
  return JSON.stringify({ jsonrpc: "2.0", id, error: { code, message } });
}

async function handleMessage(message) {
  const { id, method, params } = message;
  switch (method) {
    case "initialize":
      return jsonRpcResponse(id, {
        protocolVersion: "2024-11-05",
        capabilities: { tools: {} },
        serverInfo: { name: "my-mcp", version: "1.0.0" },
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
}

const rl = createInterface({ input: process.stdin });
rl.on("line", async (line) => {
  if (!line.trim()) return;
  try {
    const response = await handleMessage(JSON.parse(line));
    if (response) process.stdout.write(response + "\n");
  } catch {
    process.stdout.write(jsonRpcError(null, -32700, "Parse error") + "\n");
  }
});
rl.on("close", () => process.exit(0));
```

## Reference Implementations

Study these existing **zero-dependency** MCP servers in this directory:

- **`github-unified-mcp.mjs`**: ~770 lines, 22 GitHub API tools (PRs, issues, search)
- **`linear-mcp.mjs`**: ~515 lines, 9 Linear API tools (issues, projects, teams)
- **`vercel-lite-mcp.mjs`**: ~430 lines, 10 Vercel API tools (deployments, projects)
- **`logrocket-mcp.mjs`**: ~330 lines, 3 LogRocket API tools (sessions, users)

All implementations follow the same pattern:

1. Load env vars from `.env.local` files
2. Define TOOLS array with JSON Schema
3. Implement handleTool() with switch statement
4. Implement handleMessage() for MCP protocol
5. readline loop reading JSON-RPC from stdin

## Common Patterns

### Pagination

```javascript
const TOOLS = [
  {
    name: "list_items",
    inputSchema: {
      properties: {
        limit: { type: "number", description: "Items per page (default: 10)" },
        page: { type: "number", description: "Page number (default: 1)" },
      },
    },
  },
];

// In handler:
const limit = args.limit || 10;
const page = args.page || 1;
const offset = (page - 1) * limit;
```

### Webhook Support

```javascript
const TOOLS = [
  {
    name: "create_webhook",
    inputSchema: {
      properties: {
        webhookURL: { type: "string", description: "URL to receive webhook" },
      },
      required: ["webhookURL"],
    },
  },
];
```

### Multiple Required Credentials

```javascript
const API_KEY = process.env.SERVICE_API_KEY;
const API_SECRET = process.env.SERVICE_API_SECRET;
const ORG_ID = process.env.SERVICE_ORG_ID;

if (!API_KEY || !API_SECRET || !ORG_ID) {
  console.error("Error: Missing required credentials:");
  if (!API_KEY) console.error("  - SERVICE_API_KEY");
  if (!API_SECRET) console.error("  - SERVICE_API_SECRET");
  if (!ORG_ID) console.error("  - SERVICE_ORG_ID");
  process.exit(1);
}
```

## Troubleshooting

### Server Not Loading

1. Check file is executable: `chmod +x .claude/tools/your-service-mcp.mjs`
2. Verify `.mcp.json` path is correct
3. Test server directly: `node .claude/tools/your-service-mcp.mjs`
4. Restart Claude Code

### Environment Variables Not Found

1. Check `.env.local` exists in `.claude/tools/` or project root
2. Verify variable names match exactly (case-sensitive)
3. Check for quotes in values (both `"value"` and `value` should work)
4. Restart Claude Code after changing `.env.local`

### API Errors

1. Verify API key is correct and active
2. Check API endpoint URLs
3. Review API rate limits
4. Test with curl/Postman first

### Tools Not Appearing

1. Verify tool names in `TOOLS` array match cases in handler
2. Check `inputSchema` is valid JSON Schema
3. Ensure `ListToolsRequestSchema` handler returns `{ tools: TOOLS }`
4. Restart Claude Code

## Resources

- [Model Context Protocol Docs](https://modelcontextprotocol.io)
- [MCP SDK on npm](https://www.npmjs.com/package/@modelcontextprotocol/sdk)
- [JSON Schema Reference](https://json-schema.org/understanding-json-schema/)
- [Example MCP servers](https://github.com/modelcontextprotocol/servers)

## Checklist for New MCP Servers

- [ ] Research API documentation
- [ ] Design 3-10 focused tools
- [ ] Create `.mjs` file following pattern
- [ ] Implement environment variable loading
- [ ] Add API helper function
- [ ] Define tool schemas
- [ ] Implement tool handlers with error handling
- [ ] Update `.env.local.example`
- [ ] Add to `.mcp.json`
- [ ] Test with actual API calls
- [ ] Verify error messages are clear
- [ ] Make file executable (`chmod +x`)
- [ ] Test in Claude Code
- [ ] Document credentials in `.env.local.example`

## Need Help?

When asking Claude to create a new MCP server, provide:

1. **Service name**: What API/service to integrate
2. **API documentation URL**: Link to official API docs
3. **Authentication**: How to authenticate (API key, token, OAuth)
4. **Desired tools**: What operations you want (list 3-10 specific actions)
5. **Credentials**: Where to get API keys/tokens

Example prompt:

```
Create an MCP server for [Service Name]. I want these tools:
1. [action]: [description]
2. [action]: [description]
3. [action]: [description]

API docs: [URL]
Auth: [Bearer token / API key / etc]
Get credentials from: [URL]
```

Claude will create the single-file `.mjs` wrapper following this guide.
