#!/usr/bin/env node
/**
 * GitHub MCP Server (Zero-Dependency)
 *
 * A zero-dependency MCP server using only Node.js built-ins.
 * Implements MCP protocol (JSON-RPC 2.0 over stdio) directly.
 * Uses GitHub REST API via raw fetch calls.
 *
 * Tools Provided:
 * - Repository: search_repositories, create_repository, fork_repository, create_branch, list_commits
 * - Issues: create_issue, list_issues, update_issue, add_issue_comment, get_issue_comments, get_issue, search_issues
 * - Pull Requests: create_pull_request, list_pull_requests, get_pull_request, github_update_pull_request
 * - PR Details: get_pull_request_files, get_pull_request_comments, get_pull_request_reviews
 * - PR Actions: get_pull_request_status, create_pull_request_review, merge_pull_request
 * - PR Branch: update_pull_request_branch
 * - Search: search_code, search_users
 *
 * BLOCKED (use Git MCP instead): push_files, create_or_update_file, get_file_contents
 *
 * Requires GITHUB_PERSONAL_ACCESS_TOKEN in .env.local or .claude/tools/.env.local
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

    const match = trimmed.match(/^GITHUB_PERSONAL_ACCESS_TOKEN=(.+)$/);
    if (match) {
      let token = match[1].trim();
      if ((token.startsWith('"') && token.endsWith('"')) ||
          (token.startsWith("'") && token.endsWith("'"))) {
        token = token.slice(1, -1);
      }
      process.env.GITHUB_PERSONAL_ACCESS_TOKEN = token;
      break;
    }
  }
}

loadEnvFile(join(projectRoot, ".env.local"));
loadEnvFile(join(__toolsDir, ".env.local"));

const GITHUB_TOKEN = process.env.GITHUB_PERSONAL_ACCESS_TOKEN;
if (!GITHUB_TOKEN) {
  console.error("Error: GITHUB_PERSONAL_ACCESS_TOKEN not found");
  console.error("Please set it in .env.local or .claude/tools/.env.local");
  process.exit(1);
}

const GITHUB_API = "https://api.github.com";

// GitHub API helper
async function githubFetch(endpoint, options = {}) {
  const url = endpoint.startsWith("http") ? endpoint : `${GITHUB_API}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(`GitHub API error (${response.status}): ${error.message || JSON.stringify(error)}`);
  }

  const text = await response.text();
  return text ? JSON.parse(text) : {};
}

// Tool definitions
const TOOLS = [
  // Repository tools
  {
    name: "search_repositories",
    description: "Search for GitHub repositories",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query (see GitHub search syntax)" },
        page: { type: "number", description: "Page number for pagination (default: 1)" },
        perPage: { type: "number", description: "Number of results per page (default: 30, max: 100)" },
      },
      required: ["query"],
    },
  },
  {
    name: "create_repository",
    description: "Create a new GitHub repository in your account",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Repository name" },
        description: { type: "string", description: "Repository description" },
        private: { type: "boolean", description: "Whether the repository should be private" },
        autoInit: { type: "boolean", description: "Initialize with README.md" },
      },
      required: ["name"],
    },
  },
  {
    name: "fork_repository",
    description: "Fork a GitHub repository to your account or specified organization",
    inputSchema: {
      type: "object",
      properties: {
        owner: { type: "string", description: "Repository owner (username or organization)" },
        repo: { type: "string", description: "Repository name" },
        organization: { type: "string", description: "Optional: organization to fork to" },
      },
      required: ["owner", "repo"],
    },
  },
  {
    name: "create_branch",
    description: "Create a new branch in a GitHub repository",
    inputSchema: {
      type: "object",
      properties: {
        owner: { type: "string", description: "Repository owner" },
        repo: { type: "string", description: "Repository name" },
        branch: { type: "string", description: "Name for the new branch" },
        from_branch: { type: "string", description: "Source branch to create from (defaults to default branch)" },
      },
      required: ["owner", "repo", "branch"],
    },
  },
  {
    name: "list_commits",
    description: "Get list of commits of a branch in a GitHub repository",
    inputSchema: {
      type: "object",
      properties: {
        owner: { type: "string" },
        repo: { type: "string" },
        sha: { type: "string", description: "Branch name or commit SHA" },
        page: { type: "number" },
        perPage: { type: "number" },
      },
      required: ["owner", "repo"],
    },
  },
  // Issue tools
  {
    name: "create_issue",
    description: "Create a new issue in a GitHub repository",
    inputSchema: {
      type: "object",
      properties: {
        owner: { type: "string" },
        repo: { type: "string" },
        title: { type: "string" },
        body: { type: "string" },
        labels: { type: "array", items: { type: "string" } },
        assignees: { type: "array", items: { type: "string" } },
        milestone: { type: "number" },
      },
      required: ["owner", "repo", "title"],
    },
  },
  {
    name: "list_issues",
    description: "List issues in a GitHub repository with filtering options",
    inputSchema: {
      type: "object",
      properties: {
        owner: { type: "string" },
        repo: { type: "string" },
        state: { type: "string", enum: ["open", "closed", "all"] },
        labels: { type: "array", items: { type: "string" } },
        sort: { type: "string", enum: ["created", "updated", "comments"] },
        direction: { type: "string", enum: ["asc", "desc"] },
        since: { type: "string" },
        page: { type: "number" },
        per_page: { type: "number" },
      },
      required: ["owner", "repo"],
    },
  },
  {
    name: "update_issue",
    description: "Update an existing issue in a GitHub repository",
    inputSchema: {
      type: "object",
      properties: {
        owner: { type: "string" },
        repo: { type: "string" },
        issue_number: { type: "number" },
        title: { type: "string" },
        body: { type: "string" },
        state: { type: "string", enum: ["open", "closed"] },
        labels: { type: "array", items: { type: "string" } },
        assignees: { type: "array", items: { type: "string" } },
        milestone: { type: "number" },
      },
      required: ["owner", "repo", "issue_number"],
    },
  },
  {
    name: "add_issue_comment",
    description: "Add a comment to an existing issue",
    inputSchema: {
      type: "object",
      properties: {
        owner: { type: "string" },
        repo: { type: "string" },
        issue_number: { type: "number" },
        body: { type: "string" },
      },
      required: ["owner", "repo", "issue_number", "body"],
    },
  },
  {
    name: "get_issue_comments",
    description: "Get comments on an issue or pull request. Note: GitHub treats PR conversation comments as issue comments. Use this to fetch bot comments (e.g. from Claude, Vercel, Linear) and general discussion comments on PRs.",
    inputSchema: {
      type: "object",
      properties: {
        owner: { type: "string" },
        repo: { type: "string" },
        issue_number: { type: "number", description: "Issue or pull request number" },
        since: { type: "string", description: "Only show comments updated after this time (ISO 8601 format)" },
        page: { type: "number", description: "Page number for pagination (default: 1)" },
        per_page: { type: "number", description: "Results per page (default: 30, max: 100)" },
      },
      required: ["owner", "repo", "issue_number"],
    },
  },
  {
    name: "get_issue",
    description: "Get details of a specific issue in a GitHub repository",
    inputSchema: {
      type: "object",
      properties: {
        owner: { type: "string" },
        repo: { type: "string" },
        issue_number: { type: "number" },
      },
      required: ["owner", "repo", "issue_number"],
    },
  },
  {
    name: "search_issues",
    description: "Search for issues and pull requests across GitHub repositories",
    inputSchema: {
      type: "object",
      properties: {
        q: { type: "string", description: "Search query" },
        sort: { type: "string", enum: ["comments", "reactions", "created", "updated"] },
        order: { type: "string", enum: ["asc", "desc"] },
        page: { type: "number" },
        per_page: { type: "number" },
      },
      required: ["q"],
    },
  },
  // Pull Request tools
  {
    name: "create_pull_request",
    description: "Create a new pull request in a GitHub repository",
    inputSchema: {
      type: "object",
      properties: {
        owner: { type: "string", description: "Repository owner" },
        repo: { type: "string", description: "Repository name" },
        title: { type: "string", description: "Pull request title" },
        head: { type: "string", description: "Branch where your changes are implemented" },
        base: { type: "string", description: "Branch you want changes pulled into" },
        body: { type: "string", description: "Pull request body/description" },
        draft: { type: "boolean", description: "Create as draft pull request" },
        maintainer_can_modify: { type: "boolean" },
      },
      required: ["owner", "repo", "title", "head", "base"],
    },
  },
  {
    name: "list_pull_requests",
    description: "List and filter repository pull requests",
    inputSchema: {
      type: "object",
      properties: {
        owner: { type: "string" },
        repo: { type: "string" },
        state: { type: "string", enum: ["open", "closed", "all"] },
        head: { type: "string" },
        base: { type: "string" },
        sort: { type: "string", enum: ["created", "updated", "popularity", "long-running"] },
        direction: { type: "string", enum: ["asc", "desc"] },
        page: { type: "number" },
        per_page: { type: "number" },
      },
      required: ["owner", "repo"],
    },
  },
  {
    name: "get_pull_request",
    description: "Get details of a specific pull request",
    inputSchema: {
      type: "object",
      properties: {
        owner: { type: "string" },
        repo: { type: "string" },
        pull_number: { type: "number" },
      },
      required: ["owner", "repo", "pull_number"],
    },
  },
  {
    name: "github_update_pull_request",
    description: "Update a pull request's title, body, base branch, or state",
    inputSchema: {
      type: "object",
      properties: {
        owner: { type: "string" },
        repo: { type: "string" },
        pull_number: { type: "number" },
        title: { type: "string" },
        body: { type: "string" },
        base: { type: "string", description: "Target branch to change to" },
        state: { type: "string", enum: ["open", "closed"] },
        maintainer_can_modify: { type: "boolean" },
      },
      required: ["owner", "repo", "pull_number"],
    },
  },
  {
    name: "get_pull_request_files",
    description: "Get the list of files changed in a pull request",
    inputSchema: {
      type: "object",
      properties: {
        owner: { type: "string" },
        repo: { type: "string" },
        pull_number: { type: "number" },
      },
      required: ["owner", "repo", "pull_number"],
    },
  },
  {
    name: "get_pull_request_comments",
    description: "Get the review comments on a pull request",
    inputSchema: {
      type: "object",
      properties: {
        owner: { type: "string" },
        repo: { type: "string" },
        pull_number: { type: "number" },
      },
      required: ["owner", "repo", "pull_number"],
    },
  },
  {
    name: "get_pull_request_reviews",
    description: "Get the reviews on a pull request",
    inputSchema: {
      type: "object",
      properties: {
        owner: { type: "string" },
        repo: { type: "string" },
        pull_number: { type: "number" },
      },
      required: ["owner", "repo", "pull_number"],
    },
  },
  {
    name: "get_pull_request_status",
    description: "Get the combined status of all status checks for a pull request",
    inputSchema: {
      type: "object",
      properties: {
        owner: { type: "string" },
        repo: { type: "string" },
        pull_number: { type: "number" },
      },
      required: ["owner", "repo", "pull_number"],
    },
  },
  {
    name: "create_pull_request_review",
    description: "Create a review on a pull request",
    inputSchema: {
      type: "object",
      properties: {
        owner: { type: "string" },
        repo: { type: "string" },
        pull_number: { type: "number" },
        body: { type: "string", description: "Review body text" },
        event: { type: "string", enum: ["APPROVE", "REQUEST_CHANGES", "COMMENT"] },
        commit_id: { type: "string", description: "SHA of commit to review" },
        comments: {
          type: "array",
          description: "Review comments",
          items: {
            type: "object",
            properties: {
              path: { type: "string" },
              position: { type: "number" },
              line: { type: "number" },
              body: { type: "string" },
            },
          },
        },
      },
      required: ["owner", "repo", "pull_number", "body", "event"],
    },
  },
  {
    name: "merge_pull_request",
    description: "Merge a pull request",
    inputSchema: {
      type: "object",
      properties: {
        owner: { type: "string" },
        repo: { type: "string" },
        pull_number: { type: "number" },
        commit_title: { type: "string" },
        commit_message: { type: "string" },
        merge_method: { type: "string", enum: ["merge", "squash", "rebase"] },
      },
      required: ["owner", "repo", "pull_number"],
    },
  },
  {
    name: "update_pull_request_branch",
    description: "Update a pull request branch with the latest changes from the base branch",
    inputSchema: {
      type: "object",
      properties: {
        owner: { type: "string" },
        repo: { type: "string" },
        pull_number: { type: "number" },
        expected_head_sha: { type: "string" },
      },
      required: ["owner", "repo", "pull_number"],
    },
  },
  // Search tools
  {
    name: "search_code",
    description: "Search for code across GitHub repositories",
    inputSchema: {
      type: "object",
      properties: {
        q: { type: "string", description: "Search query" },
        order: { type: "string", enum: ["asc", "desc"] },
        page: { type: "number" },
        per_page: { type: "number" },
      },
      required: ["q"],
    },
  },
  {
    name: "search_users",
    description: "Search for users on GitHub",
    inputSchema: {
      type: "object",
      properties: {
        q: { type: "string", description: "Search query" },
        sort: { type: "string", enum: ["followers", "repositories", "joined"] },
        order: { type: "string", enum: ["asc", "desc"] },
        page: { type: "number" },
        per_page: { type: "number" },
      },
      required: ["q"],
    },
  },
];

// Tool handlers
async function handleTool(name, args) {
  switch (name) {
    // Repository tools
    case "search_repositories": {
      const params = new URLSearchParams({ q: args.query });
      if (args.page) params.set("page", String(args.page));
      if (args.perPage) params.set("per_page", String(args.perPage));
      return await githubFetch(`/search/repositories?${params}`);
    }

    case "create_repository": {
      const body = { name: args.name };
      if (args.description) body.description = args.description;
      if (args.private !== undefined) body.private = args.private;
      if (args.autoInit) body.auto_init = args.autoInit;
      return await githubFetch("/user/repos", {
        method: "POST",
        body: JSON.stringify(body),
      });
    }

    case "fork_repository": {
      const body = {};
      if (args.organization) body.organization = args.organization;
      return await githubFetch(`/repos/${args.owner}/${args.repo}/forks`, {
        method: "POST",
        body: JSON.stringify(body),
      });
    }

    case "create_branch": {
      // First get the SHA of the source branch
      const sourceBranch = args.from_branch || "main";
      const ref = await githubFetch(`/repos/${args.owner}/${args.repo}/git/ref/heads/${sourceBranch}`);

      // Create new branch
      return await githubFetch(`/repos/${args.owner}/${args.repo}/git/refs`, {
        method: "POST",
        body: JSON.stringify({
          ref: `refs/heads/${args.branch}`,
          sha: ref.object.sha,
        }),
      });
    }

    case "list_commits": {
      const params = new URLSearchParams();
      if (args.sha) params.set("sha", args.sha);
      if (args.page) params.set("page", String(args.page));
      if (args.perPage) params.set("per_page", String(args.perPage));
      return await githubFetch(`/repos/${args.owner}/${args.repo}/commits?${params}`);
    }

    // Issue tools
    case "create_issue": {
      const body = { title: args.title };
      if (args.body) body.body = args.body;
      if (args.labels) body.labels = args.labels;
      if (args.assignees) body.assignees = args.assignees;
      if (args.milestone) body.milestone = args.milestone;
      return await githubFetch(`/repos/${args.owner}/${args.repo}/issues`, {
        method: "POST",
        body: JSON.stringify(body),
      });
    }

    case "list_issues": {
      const params = new URLSearchParams();
      if (args.state) params.set("state", args.state);
      if (args.labels) params.set("labels", args.labels.join(","));
      if (args.sort) params.set("sort", args.sort);
      if (args.direction) params.set("direction", args.direction);
      if (args.since) params.set("since", args.since);
      if (args.page) params.set("page", String(args.page));
      if (args.per_page) params.set("per_page", String(args.per_page));
      return await githubFetch(`/repos/${args.owner}/${args.repo}/issues?${params}`);
    }

    case "update_issue": {
      const body = {};
      if (args.title) body.title = args.title;
      if (args.body) body.body = args.body;
      if (args.state) body.state = args.state;
      if (args.labels) body.labels = args.labels;
      if (args.assignees) body.assignees = args.assignees;
      if (args.milestone !== undefined) body.milestone = args.milestone;
      return await githubFetch(`/repos/${args.owner}/${args.repo}/issues/${args.issue_number}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
    }

    case "add_issue_comment": {
      return await githubFetch(`/repos/${args.owner}/${args.repo}/issues/${args.issue_number}/comments`, {
        method: "POST",
        body: JSON.stringify({ body: args.body }),
      });
    }

    case "get_issue_comments": {
      const params = new URLSearchParams();
      if (args.since) params.set("since", args.since);
      if (args.page) params.set("page", String(args.page));
      if (args.per_page) params.set("per_page", String(args.per_page));
      return await githubFetch(`/repos/${args.owner}/${args.repo}/issues/${args.issue_number}/comments?${params}`);
    }

    case "get_issue": {
      return await githubFetch(`/repos/${args.owner}/${args.repo}/issues/${args.issue_number}`);
    }

    case "search_issues": {
      const params = new URLSearchParams({ q: args.q });
      if (args.sort) params.set("sort", args.sort);
      if (args.order) params.set("order", args.order);
      if (args.page) params.set("page", String(args.page));
      if (args.per_page) params.set("per_page", String(args.per_page));
      return await githubFetch(`/search/issues?${params}`);
    }

    // Pull Request tools
    case "create_pull_request": {
      const body = {
        title: args.title,
        head: args.head,
        base: args.base,
      };
      if (args.body) body.body = args.body;
      if (args.draft !== undefined) body.draft = args.draft;
      if (args.maintainer_can_modify !== undefined) body.maintainer_can_modify = args.maintainer_can_modify;
      return await githubFetch(`/repos/${args.owner}/${args.repo}/pulls`, {
        method: "POST",
        body: JSON.stringify(body),
      });
    }

    case "list_pull_requests": {
      const params = new URLSearchParams();
      if (args.state) params.set("state", args.state);
      if (args.head) params.set("head", args.head);
      if (args.base) params.set("base", args.base);
      if (args.sort) params.set("sort", args.sort);
      if (args.direction) params.set("direction", args.direction);
      if (args.page) params.set("page", String(args.page));
      if (args.per_page) params.set("per_page", String(args.per_page));
      return await githubFetch(`/repos/${args.owner}/${args.repo}/pulls?${params}`);
    }

    case "get_pull_request": {
      return await githubFetch(`/repos/${args.owner}/${args.repo}/pulls/${args.pull_number}`);
    }

    case "github_update_pull_request": {
      const body = {};
      if (args.title) body.title = args.title;
      if (args.body) body.body = args.body;
      if (args.base) body.base = args.base;
      if (args.state) body.state = args.state;
      if (args.maintainer_can_modify !== undefined) body.maintainer_can_modify = args.maintainer_can_modify;
      return await githubFetch(`/repos/${args.owner}/${args.repo}/pulls/${args.pull_number}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
    }

    case "get_pull_request_files": {
      return await githubFetch(`/repos/${args.owner}/${args.repo}/pulls/${args.pull_number}/files`);
    }

    case "get_pull_request_comments": {
      return await githubFetch(`/repos/${args.owner}/${args.repo}/pulls/${args.pull_number}/comments`);
    }

    case "get_pull_request_reviews": {
      return await githubFetch(`/repos/${args.owner}/${args.repo}/pulls/${args.pull_number}/reviews`);
    }

    case "get_pull_request_status": {
      // Get the PR first to get the head SHA
      const pr = await githubFetch(`/repos/${args.owner}/${args.repo}/pulls/${args.pull_number}`);
      // Get combined status for the head commit
      return await githubFetch(`/repos/${args.owner}/${args.repo}/commits/${pr.head.sha}/status`);
    }

    case "create_pull_request_review": {
      const body = {
        body: args.body,
        event: args.event,
      };
      if (args.commit_id) body.commit_id = args.commit_id;
      if (args.comments) body.comments = args.comments;
      return await githubFetch(`/repos/${args.owner}/${args.repo}/pulls/${args.pull_number}/reviews`, {
        method: "POST",
        body: JSON.stringify(body),
      });
    }

    case "merge_pull_request": {
      const body = {};
      if (args.commit_title) body.commit_title = args.commit_title;
      if (args.commit_message) body.commit_message = args.commit_message;
      if (args.merge_method) body.merge_method = args.merge_method;
      return await githubFetch(`/repos/${args.owner}/${args.repo}/pulls/${args.pull_number}/merge`, {
        method: "PUT",
        body: JSON.stringify(body),
      });
    }

    case "update_pull_request_branch": {
      const body = {};
      if (args.expected_head_sha) body.expected_head_sha = args.expected_head_sha;
      return await githubFetch(`/repos/${args.owner}/${args.repo}/pulls/${args.pull_number}/update-branch`, {
        method: "PUT",
        body: JSON.stringify(body),
      });
    }

    // Search tools
    case "search_code": {
      const params = new URLSearchParams({ q: args.q });
      if (args.order) params.set("order", args.order);
      if (args.page) params.set("page", String(args.page));
      if (args.per_page) params.set("per_page", String(args.per_page));
      return await githubFetch(`/search/code?${params}`);
    }

    case "search_users": {
      const params = new URLSearchParams({ q: args.q });
      if (args.sort) params.set("sort", args.sort);
      if (args.order) params.set("order", args.order);
      if (args.page) params.set("page", String(args.page));
      if (args.per_page) params.set("per_page", String(args.per_page));
      return await githubFetch(`/search/users?${params}`);
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
          serverInfo: { name: "github-mcp-server", version: "1.0.0" },
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
