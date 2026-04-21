#!/usr/bin/env node
/**
 * Linear MCP Server
 *
 * A zero-dependency MCP server using only Node.js built-ins.
 * Implements MCP protocol (JSON-RPC 2.0 over stdio) directly.
 * Uses Linear's GraphQL API via raw fetch calls.
 *
 * Based on official Linear GraphQL API and community MCP implementations:
 * - https://linear.app/developers/graphql
 * - https://github.com/tacticlaunch/mcp-linear
 * - https://github.com/jerhadf/linear-mcp-server
 *
 * Tools Provided:
 *
 * User & Organization:
 * - linear_get_viewer: Get authenticated user info
 * - linear_get_organization: Get organization info
 * - linear_get_users: List users in organization
 *
 * Teams:
 * - linear_list_teams: List all teams
 * - linear_get_team: Get team details with issues
 *
 * Issues:
 * - linear_list_issues: List issues with filtering
 * - linear_get_issue: Get issue by ID or identifier
 * - linear_search_issues: Search issues with text query
 * - linear_create_issue: Create a new issue
 * - linear_update_issue: Update an existing issue
 * - linear_get_user_issues: Get issues assigned to a user
 *
 * Issue Management:
 * - linear_assign_issue: Assign issue to a user
 * - linear_set_issue_priority: Set issue priority
 * - linear_set_issue_state: Set issue workflow state
 * - linear_archive_issue: Archive an issue
 * - linear_add_issue_label: Add label to issue
 * - linear_remove_issue_label: Remove label from issue
 *
 * Comments:
 * - linear_create_comment: Add comment to issue
 * - linear_get_comments: Get comments for an issue
 *
 * Projects:
 * - linear_list_projects: List projects
 * - linear_create_project: Create a new project
 * - linear_add_issue_to_project: Add issue to project
 *
 * Workflow:
 * - linear_list_workflow_states: List workflow states for a team
 * - linear_get_labels: Get available labels
 *
 * Cycles:
 * - linear_get_cycles: Get cycles for a team
 * - linear_get_active_cycle: Get active cycle for a team
 * - linear_add_issue_to_cycle: Add issue to a cycle
 *
 * Images:
 * - linear_get_issue_images: Download images from issue description
 * - linear_get_comments_images: Download images from issue comments
 *
 * Uploads:
 * - linear_upload_image: Upload a local image to Linear's storage, returns asset URL
 * - linear_create_comment_with_images: Upload images and create a comment with them embedded
 *
 * Favorites:
 * - linear_favorite_issue: Add an issue to the authenticated user's favorites
 *
 * Requires LINEAR_API_KEY in .env.local or .claude/tools/.env.local
 * Get your API key from: https://linear.app/settings/api
 */
/* global process */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
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

    const match = trimmed.match(/^LINEAR_API_KEY=(.+)$/);
    if (match) {
      let token = match[1].trim();
      if ((token.startsWith('"') && token.endsWith('"')) ||
          (token.startsWith("'") && token.endsWith("'"))) {
        token = token.slice(1, -1);
      }
      process.env.LINEAR_API_KEY = token;
      break;
    }
  }
}

loadEnvFile(join(projectRoot, ".env.local"));
loadEnvFile(join(__toolsDir, ".env.local"));

const LINEAR_API_KEY = process.env.LINEAR_API_KEY;
if (!LINEAR_API_KEY) {
  console.error("Error: LINEAR_API_KEY not found");
  console.error("Please set LINEAR_API_KEY in .env.local or .claude/tools/.env.local");
  process.exit(1);
}

const LINEAR_API = "https://api.linear.app/graphql";

// GraphQL helper
async function linearQuery(query, variables = {}) {
  const response = await fetch(LINEAR_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: LINEAR_API_KEY,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Linear API error (${response.status}): ${error}`);
  }

  const result = await response.json();
  if (result.errors) {
    throw new Error(`Linear GraphQL error: ${result.errors.map(e => e.message).join(", ")}`);
  }

  return result.data;
}

// Tool definitions
const TOOLS = [
  // ===== User & Organization =====
  {
    name: "linear_get_viewer",
    description: "Get the currently authenticated user's information (useful for getting your user ID for assignments).",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "linear_get_organization",
    description: "Get information about the current Linear organization.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "linear_get_users",
    description: "Get a list of users in the Linear organization.",
    inputSchema: {
      type: "object",
      properties: {
        includeDisabled: { type: "boolean", description: "Include disabled users (default: false)" },
        first: { type: "number", description: "Number of users to return (default: 50)" },
      },
    },
  },

  // ===== Teams =====
  {
    name: "linear_list_teams",
    description: "List all teams in the workspace.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "linear_get_team",
    description: "Get detailed information about a specific team including its issues.",
    inputSchema: {
      type: "object",
      properties: {
        teamId: { type: "string", description: "Team ID" },
        includeIssues: { type: "boolean", description: "Include team's issues (default: false)" },
        issueLimit: { type: "number", description: "Number of issues to return if includeIssues is true (default: 25)" },
      },
      required: ["teamId"],
    },
  },

  // ===== Issues =====
  {
    name: "linear_list_issues",
    description: "List issues with optional filtering by team, state, assignee, or project.",
    inputSchema: {
      type: "object",
      properties: {
        teamId: { type: "string", description: "Filter by team ID" },
        stateId: { type: "string", description: "Filter by state ID" },
        assigneeId: { type: "string", description: "Filter by assignee ID" },
        projectId: { type: "string", description: "Filter by project ID" },
        first: { type: "number", description: "Number of issues to return (default: 50)" },
      },
    },
  },
  {
    name: "linear_get_issue",
    description: "Get detailed information about a specific issue by its ID or identifier (e.g., 'ENG-123').",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Issue ID or identifier (e.g., 'ENG-123')" },
      },
      required: ["id"],
    },
  },
  {
    name: "linear_search_issues",
    description: "Search for issues using a text query. Searches in title and description.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query text" },
        teamId: { type: "string", description: "Filter by team ID" },
        assigneeId: { type: "string", description: "Filter by assignee ID" },
        status: { type: "string", description: "Filter by status name" },
        first: { type: "number", description: "Number of results (default: 25)" },
      },
      required: ["query"],
    },
  },
  {
    name: "linear_create_issue",
    description: "Create a new issue in Linear.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Issue title" },
        description: { type: "string", description: "Issue description (markdown supported)" },
        teamId: { type: "string", description: "Team ID (required)" },
        stateId: { type: "string", description: "Workflow state ID" },
        assigneeId: { type: "string", description: "Assignee user ID" },
        priority: { type: "number", description: "Priority (0=none, 1=urgent, 2=high, 3=normal, 4=low)" },
        projectId: { type: "string", description: "Project ID" },
        parentId: { type: "string", description: "Parent issue ID (for sub-issues)" },
        labelIds: { type: "array", items: { type: "string" }, description: "Array of label IDs" },
        cycleId: { type: "string", description: "Cycle ID to add issue to" },
      },
      required: ["title", "teamId"],
    },
  },
  {
    name: "linear_update_issue",
    description: "Update an existing issue.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Issue ID or identifier (e.g., 'ENG-123') to update" },
        title: { type: "string", description: "New title" },
        description: { type: "string", description: "New description" },
        stateId: { type: "string", description: "New workflow state ID" },
        assigneeId: { type: "string", description: "New assignee ID (use null to unassign)" },
        priority: { type: "number", description: "New priority (0=none, 1=urgent, 2=high, 3=normal, 4=low)" },
        projectId: { type: "string", description: "New project ID" },
        cycleId: { type: "string", description: "New cycle ID" },
      },
      required: ["id"],
    },
  },
  {
    name: "linear_get_user_issues",
    description: "Get issues assigned to a specific user or the authenticated user.",
    inputSchema: {
      type: "object",
      properties: {
        userId: { type: "string", description: "User ID (omit to get authenticated user's issues)" },
        includeArchived: { type: "boolean", description: "Include archived issues (default: false)" },
        first: { type: "number", description: "Number of issues to return (default: 50)" },
      },
    },
  },

  // ===== Issue Management =====
  {
    name: "linear_assign_issue",
    description: "Assign an issue to a user.",
    inputSchema: {
      type: "object",
      properties: {
        issueId: { type: "string", description: "Issue ID or identifier to assign" },
        assigneeId: { type: "string", description: "User ID to assign (use null to unassign)" },
      },
      required: ["issueId"],
    },
  },
  {
    name: "linear_set_issue_priority",
    description: "Set the priority of an issue.",
    inputSchema: {
      type: "object",
      properties: {
        issueId: { type: "string", description: "Issue ID or identifier" },
        priority: { type: "number", description: "Priority (0=none, 1=urgent, 2=high, 3=normal, 4=low)" },
      },
      required: ["issueId", "priority"],
    },
  },
  {
    name: "linear_set_issue_state",
    description: "Set the workflow state of an issue.",
    inputSchema: {
      type: "object",
      properties: {
        issueId: { type: "string", description: "Issue ID or identifier" },
        stateId: { type: "string", description: "Workflow state ID" },
      },
      required: ["issueId", "stateId"],
    },
  },
  {
    name: "linear_archive_issue",
    description: "Archive an issue.",
    inputSchema: {
      type: "object",
      properties: {
        issueId: { type: "string", description: "Issue ID or identifier to archive" },
      },
      required: ["issueId"],
    },
  },
  {
    name: "linear_add_issue_label",
    description: "Add a label to an issue.",
    inputSchema: {
      type: "object",
      properties: {
        issueId: { type: "string", description: "Issue ID or identifier" },
        labelId: { type: "string", description: "Label ID to add" },
      },
      required: ["issueId", "labelId"],
    },
  },
  {
    name: "linear_remove_issue_label",
    description: "Remove a label from an issue.",
    inputSchema: {
      type: "object",
      properties: {
        issueId: { type: "string", description: "Issue ID or identifier" },
        labelId: { type: "string", description: "Label ID to remove" },
      },
      required: ["issueId", "labelId"],
    },
  },

  // ===== Comments =====
  {
    name: "linear_create_comment",
    description: "Add a comment to an issue.",
    inputSchema: {
      type: "object",
      properties: {
        issueId: { type: "string", description: "Issue ID or identifier to comment on" },
        body: { type: "string", description: "Comment body (markdown supported)" },
      },
      required: ["issueId", "body"],
    },
  },
  {
    name: "linear_get_comments",
    description: "Get all comments for an issue.",
    inputSchema: {
      type: "object",
      properties: {
        issueId: { type: "string", description: "Issue ID or identifier" },
        first: { type: "number", description: "Number of comments to return (default: 50)" },
      },
      required: ["issueId"],
    },
  },

  // ===== Projects =====
  {
    name: "linear_list_projects",
    description: "List projects, optionally filtered by team.",
    inputSchema: {
      type: "object",
      properties: {
        teamId: { type: "string", description: "Filter by team ID" },
        first: { type: "number", description: "Number of projects to return (default: 50)" },
      },
    },
  },
  {
    name: "linear_create_project",
    description: "Create a new project in Linear.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Project name" },
        description: { type: "string", description: "Project description" },
        teamIds: { type: "array", items: { type: "string" }, description: "Array of team IDs this project belongs to" },
        leadId: { type: "string", description: "Project lead user ID" },
        state: { type: "string", description: "Project state (planned, started, paused, completed, canceled)" },
      },
      required: ["name", "teamIds"],
    },
  },
  {
    name: "linear_add_issue_to_project",
    description: "Add an existing issue to a project.",
    inputSchema: {
      type: "object",
      properties: {
        issueId: { type: "string", description: "Issue ID or identifier" },
        projectId: { type: "string", description: "Project ID to add issue to" },
      },
      required: ["issueId", "projectId"],
    },
  },

  // ===== Workflow & Labels =====
  {
    name: "linear_list_workflow_states",
    description: "List workflow states for a team (e.g., Backlog, In Progress, Done).",
    inputSchema: {
      type: "object",
      properties: {
        teamId: { type: "string", description: "Team ID to get states for" },
      },
      required: ["teamId"],
    },
  },
  {
    name: "linear_get_labels",
    description: "Get available labels, optionally filtered by team.",
    inputSchema: {
      type: "object",
      properties: {
        teamId: { type: "string", description: "Filter by team ID" },
        first: { type: "number", description: "Number of labels to return (default: 100)" },
      },
    },
  },

  // ===== Cycles =====
  {
    name: "linear_get_cycles",
    description: "Get cycles for a team.",
    inputSchema: {
      type: "object",
      properties: {
        teamId: { type: "string", description: "Team ID to get cycles for" },
        first: { type: "number", description: "Number of cycles to return (default: 10)" },
      },
      required: ["teamId"],
    },
  },
  {
    name: "linear_get_active_cycle",
    description: "Get the currently active cycle for a team.",
    inputSchema: {
      type: "object",
      properties: {
        teamId: { type: "string", description: "Team ID to get active cycle for" },
      },
      required: ["teamId"],
    },
  },
  {
    name: "linear_add_issue_to_cycle",
    description: "Add an issue to a cycle.",
    inputSchema: {
      type: "object",
      properties: {
        issueId: { type: "string", description: "Issue ID or identifier" },
        cycleId: { type: "string", description: "Cycle ID to add issue to" },
      },
      required: ["issueId", "cycleId"],
    },
  },

  // ===== Images =====
  {
    name: "linear_get_issue_images",
    description: "Download images embedded in an issue's description. Parses markdown image syntax and downloads files to the specified directory.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Issue ID or identifier (e.g., 'CLA-1234')" },
        outputDir: { type: "string", description: "Directory to save downloaded images (will be created if it doesn't exist)" },
      },
      required: ["id", "outputDir"],
    },
  },
  {
    name: "linear_get_comments_images",
    description: "Download images embedded in an issue's comments. Parses markdown image syntax and downloads files to the specified directory.",
    inputSchema: {
      type: "object",
      properties: {
        issueId: { type: "string", description: "Issue ID or identifier (e.g., 'CLA-1234')" },
        outputDir: { type: "string", description: "Directory to save downloaded images (will be created if it doesn't exist)" },
      },
      required: ["issueId", "outputDir"],
    },
  },

  // ===== Uploads =====
  {
    name: "linear_upload_image",
    description: "Upload a local image file to Linear's storage and return the asset URL. The returned URL can be used in markdown comments/descriptions with ![alt](url) syntax.",
    inputSchema: {
      type: "object",
      properties: {
        filePath: { type: "string", description: "Absolute path to the local image file to upload" },
        filename: { type: "string", description: "Optional filename override (defaults to original filename)" },
      },
      required: ["filePath"],
    },
  },
  {
    name: "linear_create_comment_with_images",
    description: "Upload local images to Linear and create a comment on an issue with the images embedded. Images are uploaded first, then referenced in the comment body using markdown image syntax.",
    inputSchema: {
      type: "object",
      properties: {
        issueId: { type: "string", description: "Issue ID or identifier (e.g., 'CLA-1234')" },
        body: { type: "string", description: "Comment body in markdown. Use {image:N} placeholders (1-indexed) where images should appear, e.g., 'Here is the screenshot:\\n\\n{image:1}\\n\\nAnd another:\\n\\n{image:2}'" },
        imagePaths: {
          type: "array",
          items: { type: "string" },
          description: "Array of absolute paths to local image files to upload and embed",
        },
      },
      required: ["issueId", "body", "imagePaths"],
    },
  },

  // ===== Favorites =====
  {
    name: "linear_favorite_issue",
    description: "Add an issue to the authenticated user's favorites (starred items). The issue appears in the user's favorites sidebar in Linear.",
    inputSchema: {
      type: "object",
      properties: {
        issueId: { type: "string", description: "Issue ID or identifier (e.g., 'CLA-1234') to favorite" },
      },
      required: ["issueId"],
    },
  },
];

// Helper to get issue ID from identifier (e.g., "ENG-123")
async function resolveIssueId(idOrIdentifier) {
  if (!idOrIdentifier.includes("-")) {
    return idOrIdentifier; // Already an ID
  }

  const data = await linearQuery(`
    query($identifier: String!) {
      issue(id: $identifier) {
        id
      }
    }
  `, { identifier: idOrIdentifier });

  if (!data.issue) {
    throw new Error(`Issue not found: ${idOrIdentifier}`);
  }

  return data.issue.id;
}

// Helper to extract image URLs from markdown text
function extractMarkdownImages(text) {
  if (!text) return [];
  // Match ![alt text](url) pattern
  const regex = /!\[([^\]]*)\]\(([^)]+)\)/g;
  const images = [];
  let match;
  while ((match = regex.exec(text)) !== null) {
    images.push({
      alt: match[1],
      url: match[2],
    });
  }
  return images;
}

// Helper to determine if a URL points to a trusted Linear asset host
function isLinearAssetUrl(url) {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();
    return (
      hostname === "linear.app" ||
      hostname === "api.linear.app" ||
      hostname.endsWith(".linear.app") ||
      hostname === "linearusercontent.com" ||
      hostname.endsWith(".linearusercontent.com")
    );
  } catch {
    // If URL parsing fails, treat as untrusted and do not send auth
    return false;
  }
}

// Helper to validate outputDir stays within project root (prevent path traversal)
function validateOutputDir(outputDir) {
  const resolved = resolve(projectRoot, outputDir);
  const normalizedRoot = resolve(projectRoot);

  // Ensure the resolved path is within projectRoot
  if (!resolved.startsWith(normalizedRoot + "/") && !resolved.startsWith(normalizedRoot + "\\") && resolved !== normalizedRoot) {
    throw new Error(`Security error: outputDir must be within project root. Got: ${outputDir}`);
  }

  return resolved;
}

// Helper to download an image and save to disk
async function downloadImage(url, outputPath) {
  const fetchOptions = {};

  // Only send Authorization header for known Linear asset hosts
  // This prevents leaking the API key to external image hosts
  if (LINEAR_API_KEY && isLinearAssetUrl(url)) {
    fetchOptions.headers = {
      Authorization: LINEAR_API_KEY,
    };
  }

  const response = await fetch(url, fetchOptions);

  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.status} ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  writeFileSync(outputPath, buffer);

  return {
    path: outputPath,
    size: buffer.length,
    contentType: response.headers.get("content-type"),
  };
}

// Helper to sanitize filename
function sanitizeFilename(filename) {
  // Remove or replace problematic characters
  return filename
    .replace(/[<>:"/\\|?*]/g, "_")
    .replace(/\s+/g, "_")
    .substring(0, 200); // Limit length
}

// Helper to upload a file to Linear's storage
async function uploadFileToLinear(filePath, filenameOverride) {
  // Validate path is within project root
  const resolvedPath = resolve(filePath);

  if (!existsSync(resolvedPath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const fileBuffer = readFileSync(resolvedPath);
  const fileSize = fileBuffer.length;
  const filename = filenameOverride || resolvedPath.split(/[/\\]/).pop();

  // Determine content type from extension
  const ext = filename.split(".").pop().toLowerCase();
  const mimeTypes = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    webp: "image/webp",
    svg: "image/svg+xml",
    bmp: "image/bmp",
    pdf: "application/pdf",
  };
  const contentType = mimeTypes[ext] || "application/octet-stream";

  // Step 1: Request upload URL from Linear
  const data = await linearQuery(`
    mutation($size: Int!, $contentType: String!, $filename: String!) {
      fileUpload(size: $size, contentType: $contentType, filename: $filename) {
        uploadFile {
          filename
          uploadUrl
          assetUrl
          size
          contentType
          headers {
            key
            value
          }
        }
      }
    }
  `, { size: fileSize, contentType, filename });

  const uploadFile = data.fileUpload?.uploadFile;
  if (!uploadFile) {
    throw new Error("Failed to get upload URL from Linear");
  }

  // Step 2: Upload the file to the presigned URL
  // Build headers from Linear's response (includes required signed headers)
  const uploadHeaders = {
    "Content-Type": contentType,
    "Content-Length": String(fileSize),
    "Cache-Control": "public, max-age=31536000",
  };

  // Add headers from Linear's fileUpload response (e.g., x-goog-content-length-range)
  if (uploadFile.headers && Array.isArray(uploadFile.headers)) {
    for (const h of uploadFile.headers) {
      if (h.key && h.value) {
        uploadHeaders[h.key] = h.value;
      }
    }
  }

  const uploadResponse = await fetch(uploadFile.uploadUrl, {
    method: "PUT",
    headers: uploadHeaders,
    body: fileBuffer,
  });

  if (!uploadResponse.ok) {
    const errorText = await uploadResponse.text();
    throw new Error(`Upload failed (${uploadResponse.status}): ${errorText}`);
  }

  return {
    filename: uploadFile.filename,
    assetUrl: uploadFile.assetUrl,
    size: fileSize,
    contentType,
  };
}

// Tool handlers
async function handleTool(name, args) {
  switch (name) {
    // ===== User & Organization =====
    case "linear_get_viewer": {
      const data = await linearQuery(`
        query {
          viewer {
            id
            name
            email
            displayName
            active
            admin
            avatarUrl
            createdAt
          }
        }
      `);
      return data.viewer;
    }

    case "linear_get_organization": {
      const data = await linearQuery(`
        query {
          organization {
            id
            name
            urlKey
            logoUrl
            createdAt
            userCount
          }
        }
      `);
      return data.organization;
    }

    case "linear_get_users": {
      const data = await linearQuery(`
        query($first: Int, $includeDisabled: Boolean) {
          users(first: $first, includeDisabled: $includeDisabled) {
            nodes {
              id
              name
              email
              displayName
              active
              admin
              avatarUrl
            }
          }
        }
      `, { first: args.first || 50, includeDisabled: args.includeDisabled || false });
      return data.users.nodes;
    }

    // ===== Teams =====
    case "linear_list_teams": {
      const data = await linearQuery(`
        query {
          teams {
            nodes {
              id
              name
              key
              description
            }
          }
        }
      `);
      return data.teams.nodes;
    }

    case "linear_get_team": {
      const includeIssues = args.includeIssues || false;
      const issueLimit = args.issueLimit || 25;

      const query = includeIssues ? `
        query($teamId: String!, $issueLimit: Int) {
          team(id: $teamId) {
            id
            name
            key
            description
            issues(first: $issueLimit) {
              nodes {
                id
                identifier
                title
                state { id name }
                assignee { id name }
                priority
                createdAt
              }
            }
          }
        }
      ` : `
        query($teamId: String!) {
          team(id: $teamId) {
            id
            name
            key
            description
            private
            timezone
          }
        }
      `;

      const data = await linearQuery(query, { teamId: args.teamId, issueLimit });
      return data.team;
    }

    // ===== Issues =====
    case "linear_list_issues": {
      const filter = {};
      if (args.teamId) filter.team = { id: { eq: args.teamId } };
      if (args.stateId) filter.state = { id: { eq: args.stateId } };
      if (args.assigneeId) filter.assignee = { id: { eq: args.assigneeId } };
      if (args.projectId) filter.project = { id: { eq: args.projectId } };

      const data = await linearQuery(`
        query($filter: IssueFilter, $first: Int) {
          issues(filter: $filter, first: $first) {
            nodes {
              id
              identifier
              title
              state { id name }
              assignee { id name }
              priority
              project { id name }
              team { id name }
              createdAt
              updatedAt
            }
          }
        }
      `, { filter: Object.keys(filter).length ? filter : undefined, first: args.first || 50 });

      return data.issues.nodes;
    }

    case "linear_get_issue": {
      const data = await linearQuery(`
        query($id: String!) {
          issue(id: $id) {
            id
            identifier
            title
            description
            state { id name }
            assignee { id name email }
            priority
            project { id name }
            team { id name }
            parent { id identifier title }
            children { nodes { id identifier title } }
            labels { nodes { id name color } }
            cycle { id name startsAt endsAt }
            comments { nodes { id body user { name } createdAt } }
            createdAt
            updatedAt
            url
          }
        }
      `, { id: args.id });
      return data.issue;
    }

    case "linear_search_issues": {
      const data = await linearQuery(`
        query($term: String!, $first: Int) {
          searchIssues(term: $term, first: $first) {
            nodes {
              id
              identifier
              title
              description
              state { id name }
              assignee { id name }
              team { id name }
              priority
              url
            }
          }
        }
      `, { term: args.query, first: args.first || 25 });

      return data.searchIssues.nodes;
    }

    case "linear_create_issue": {
      const input = {
        title: args.title,
        teamId: args.teamId,
      };
      if (args.description) input.description = args.description;
      if (args.stateId) input.stateId = args.stateId;
      if (args.assigneeId) input.assigneeId = args.assigneeId;
      if (args.priority !== undefined) input.priority = args.priority;
      if (args.projectId) input.projectId = args.projectId;
      if (args.parentId) input.parentId = args.parentId;
      if (args.labelIds) input.labelIds = args.labelIds;
      if (args.cycleId) input.cycleId = args.cycleId;

      const data = await linearQuery(`
        mutation($input: IssueCreateInput!) {
          issueCreate(input: $input) {
            success
            issue {
              id
              identifier
              title
              url
            }
          }
        }
      `, { input });

      return data.issueCreate;
    }

    case "linear_update_issue": {
      const issueId = await resolveIssueId(args.id);

      const input = {};
      if (args.title) input.title = args.title;
      if (args.description !== undefined) input.description = args.description;
      if (args.stateId) input.stateId = args.stateId;
      if (args.assigneeId !== undefined) input.assigneeId = args.assigneeId;
      if (args.priority !== undefined) input.priority = args.priority;
      if (args.projectId !== undefined) input.projectId = args.projectId;
      if (args.cycleId !== undefined) input.cycleId = args.cycleId;

      const data = await linearQuery(`
        mutation($id: String!, $input: IssueUpdateInput!) {
          issueUpdate(id: $id, input: $input) {
            success
            issue {
              id
              identifier
              title
              state { id name }
              assignee { id name }
              url
            }
          }
        }
      `, { id: issueId, input });

      return data.issueUpdate;
    }

    case "linear_get_user_issues": {
      let userId = args.userId;

      // If no userId provided, get the viewer's ID
      if (!userId) {
        const viewerData = await linearQuery(`query { viewer { id } }`);
        userId = viewerData.viewer.id;
      }

      const filter = {
        assignee: { id: { eq: userId } },
      };

      if (!args.includeArchived) {
        filter.archivedAt = { null: true };
      }

      const data = await linearQuery(`
        query($filter: IssueFilter, $first: Int) {
          issues(filter: $filter, first: $first) {
            nodes {
              id
              identifier
              title
              state { id name }
              priority
              project { id name }
              team { id name }
              createdAt
              updatedAt
              url
            }
          }
        }
      `, { filter, first: args.first || 50 });

      return data.issues.nodes;
    }

    // ===== Issue Management =====
    case "linear_assign_issue": {
      const issueId = await resolveIssueId(args.issueId);

      const data = await linearQuery(`
        mutation($id: String!, $input: IssueUpdateInput!) {
          issueUpdate(id: $id, input: $input) {
            success
            issue {
              id
              identifier
              assignee { id name }
            }
          }
        }
      `, { id: issueId, input: { assigneeId: args.assigneeId || null } });

      return data.issueUpdate;
    }

    case "linear_set_issue_priority": {
      const issueId = await resolveIssueId(args.issueId);

      const data = await linearQuery(`
        mutation($id: String!, $input: IssueUpdateInput!) {
          issueUpdate(id: $id, input: $input) {
            success
            issue {
              id
              identifier
              priority
            }
          }
        }
      `, { id: issueId, input: { priority: args.priority } });

      return data.issueUpdate;
    }

    case "linear_set_issue_state": {
      const issueId = await resolveIssueId(args.issueId);

      const data = await linearQuery(`
        mutation($id: String!, $input: IssueUpdateInput!) {
          issueUpdate(id: $id, input: $input) {
            success
            issue {
              id
              identifier
              state { id name }
            }
          }
        }
      `, { id: issueId, input: { stateId: args.stateId } });

      return data.issueUpdate;
    }

    case "linear_archive_issue": {
      const issueId = await resolveIssueId(args.issueId);

      const data = await linearQuery(`
        mutation($id: String!) {
          issueArchive(id: $id) {
            success
          }
        }
      `, { id: issueId });

      return data.issueArchive;
    }

    case "linear_add_issue_label": {
      const issueId = await resolveIssueId(args.issueId);

      // First get current labels
      const issue = await linearQuery(`
        query($id: String!) {
          issue(id: $id) {
            labels { nodes { id } }
          }
        }
      `, { id: issueId });

      const currentLabelIds = issue.issue.labels.nodes.map(l => l.id);
      const newLabelIds = [...new Set([...currentLabelIds, args.labelId])];

      const data = await linearQuery(`
        mutation($id: String!, $input: IssueUpdateInput!) {
          issueUpdate(id: $id, input: $input) {
            success
            issue {
              id
              identifier
              labels { nodes { id name } }
            }
          }
        }
      `, { id: issueId, input: { labelIds: newLabelIds } });

      return data.issueUpdate;
    }

    case "linear_remove_issue_label": {
      const issueId = await resolveIssueId(args.issueId);

      // First get current labels
      const issue = await linearQuery(`
        query($id: String!) {
          issue(id: $id) {
            labels { nodes { id } }
          }
        }
      `, { id: issueId });

      const newLabelIds = issue.issue.labels.nodes
        .map(l => l.id)
        .filter(id => id !== args.labelId);

      const data = await linearQuery(`
        mutation($id: String!, $input: IssueUpdateInput!) {
          issueUpdate(id: $id, input: $input) {
            success
            issue {
              id
              identifier
              labels { nodes { id name } }
            }
          }
        }
      `, { id: issueId, input: { labelIds: newLabelIds } });

      return data.issueUpdate;
    }

    // ===== Comments =====
    case "linear_create_comment": {
      const issueId = await resolveIssueId(args.issueId);

      const data = await linearQuery(`
        mutation($input: CommentCreateInput!) {
          commentCreate(input: $input) {
            success
            comment {
              id
              body
              createdAt
              user { name }
            }
          }
        }
      `, { input: { issueId, body: args.body } });

      return data.commentCreate;
    }

    case "linear_get_comments": {
      const issueId = await resolveIssueId(args.issueId);

      const data = await linearQuery(`
        query($id: String!, $first: Int) {
          issue(id: $id) {
            comments(first: $first) {
              nodes {
                id
                body
                createdAt
                updatedAt
                user { id name email }
              }
            }
          }
        }
      `, { id: issueId, first: args.first || 50 });

      return data.issue.comments.nodes;
    }

    // ===== Projects =====
    case "linear_list_projects": {
      const filter = {};
      if (args.teamId) filter.accessibleTeams = { id: { eq: args.teamId } };

      const data = await linearQuery(`
        query($filter: ProjectFilter, $first: Int) {
          projects(filter: $filter, first: $first) {
            nodes {
              id
              name
              description
              state
              progress
              lead { id name }
              teams { nodes { id name } }
              createdAt
              updatedAt
            }
          }
        }
      `, { filter: Object.keys(filter).length ? filter : undefined, first: args.first || 50 });

      return data.projects.nodes;
    }

    case "linear_create_project": {
      const input = {
        name: args.name,
        teamIds: args.teamIds,
      };
      if (args.description) input.description = args.description;
      if (args.leadId) input.leadId = args.leadId;
      if (args.state) input.state = args.state;

      const data = await linearQuery(`
        mutation($input: ProjectCreateInput!) {
          projectCreate(input: $input) {
            success
            project {
              id
              name
              state
              url
            }
          }
        }
      `, { input });

      return data.projectCreate;
    }

    case "linear_add_issue_to_project": {
      const issueId = await resolveIssueId(args.issueId);

      const data = await linearQuery(`
        mutation($id: String!, $input: IssueUpdateInput!) {
          issueUpdate(id: $id, input: $input) {
            success
            issue {
              id
              identifier
              project { id name }
            }
          }
        }
      `, { id: issueId, input: { projectId: args.projectId } });

      return data.issueUpdate;
    }

    // ===== Workflow & Labels =====
    case "linear_list_workflow_states": {
      const data = await linearQuery(`
        query($teamId: ID!) {
          workflowStates(filter: { team: { id: { eq: $teamId } } }) {
            nodes {
              id
              name
              type
              position
              color
            }
          }
        }
      `, { teamId: args.teamId });

      return data.workflowStates.nodes;
    }

    case "linear_get_labels": {
      const filter = {};
      if (args.teamId) filter.team = { id: { eq: args.teamId } };

      const data = await linearQuery(`
        query($filter: IssueLabelFilter, $first: Int) {
          issueLabels(filter: $filter, first: $first) {
            nodes {
              id
              name
              color
              description
              team { id name }
            }
          }
        }
      `, { filter: Object.keys(filter).length ? filter : undefined, first: args.first || 100 });

      return data.issueLabels.nodes;
    }

    // ===== Cycles =====
    case "linear_get_cycles": {
      const data = await linearQuery(`
        query($teamId: ID!, $first: Int) {
          cycles(filter: { team: { id: { eq: $teamId } } }, first: $first) {
            nodes {
              id
              name
              number
              startsAt
              endsAt
              progress
              completedAt
            }
          }
        }
      `, { teamId: args.teamId, first: args.first || 10 });

      return data.cycles.nodes;
    }

    case "linear_get_active_cycle": {
      const data = await linearQuery(`
        query($teamId: String!) {
          team(id: $teamId) {
            activeCycle {
              id
              name
              number
              startsAt
              endsAt
              progress
            }
          }
        }
      `, { teamId: args.teamId });

      return data.team?.activeCycle || null;
    }

    case "linear_add_issue_to_cycle": {
      const issueId = await resolveIssueId(args.issueId);

      const data = await linearQuery(`
        mutation($id: String!, $input: IssueUpdateInput!) {
          issueUpdate(id: $id, input: $input) {
            success
            issue {
              id
              identifier
              cycle { id name }
            }
          }
        }
      `, { id: issueId, input: { cycleId: args.cycleId } });

      return data.issueUpdate;
    }

    // ===== Images =====
    case "linear_get_issue_images": {
      // Fetch the issue to get its description
      const data = await linearQuery(`
        query($id: String!) {
          issue(id: $id) {
            id
            identifier
            title
            description
          }
        }
      `, { id: args.id });

      if (!data.issue) {
        throw new Error(`Issue not found: ${args.id}`);
      }

      const images = extractMarkdownImages(data.issue.description);

      if (images.length === 0) {
        return {
          issueId: data.issue.identifier,
          issueTitle: data.issue.title,
          imagesFound: 0,
          downloaded: [],
          message: "No images found in issue description",
        };
      }

      // Create output directory (with path traversal protection)
      const outputDir = validateOutputDir(args.outputDir);
      mkdirSync(outputDir, { recursive: true });

      const downloaded = [];
      const errors = [];

      for (let i = 0; i < images.length; i++) {
        const img = images[i];
        try {
          // Extract filename from URL or use index
          // Prefix with issue identifier to prevent filename collisions across issues
          const urlParts = img.url.split("/");
          const rawFilename = img.alt || urlParts[urlParts.length - 1] || `image_${i + 1}.png`;
          const filename = sanitizeFilename(`${data.issue.identifier}_${rawFilename}`);
          const outputPath = join(outputDir, filename);

          const result = await downloadImage(img.url, outputPath);
          downloaded.push({
            index: i + 1,
            alt: img.alt,
            url: img.url,
            savedTo: outputPath,
            size: result.size,
            contentType: result.contentType,
          });
        } catch (error) {
          errors.push({
            index: i + 1,
            alt: img.alt,
            url: img.url,
            error: error.message,
          });
        }
      }

      return {
        issueId: data.issue.identifier,
        issueTitle: data.issue.title,
        imagesFound: images.length,
        downloaded,
        errors: errors.length > 0 ? errors : undefined,
        outputDir,
      };
    }

    case "linear_get_comments_images": {
      const issueId = await resolveIssueId(args.issueId);

      // Fetch all comments for the issue
      const data = await linearQuery(`
        query($id: String!, $first: Int) {
          issue(id: $id) {
            id
            identifier
            title
            comments(first: $first) {
              nodes {
                id
                body
                createdAt
                user { name }
              }
            }
          }
        }
      `, { id: issueId, first: 100 });

      if (!data.issue) {
        throw new Error(`Issue not found: ${args.issueId}`);
      }

      // Extract images from all comments
      const allImages = [];
      for (const comment of data.issue.comments.nodes) {
        const images = extractMarkdownImages(comment.body);
        for (const img of images) {
          allImages.push({
            ...img,
            commentId: comment.id,
            commentAuthor: comment.user?.name || "Unknown",
            commentDate: comment.createdAt,
          });
        }
      }

      if (allImages.length === 0) {
        return {
          issueId: data.issue.identifier,
          issueTitle: data.issue.title,
          commentsChecked: data.issue.comments.nodes.length,
          imagesFound: 0,
          downloaded: [],
          message: "No images found in comments",
        };
      }

      // Create output directory (with path traversal protection)
      const outputDir = validateOutputDir(args.outputDir);
      mkdirSync(outputDir, { recursive: true });

      const downloaded = [];
      const errors = [];

      for (let i = 0; i < allImages.length; i++) {
        const img = allImages[i];
        try {
          // Extract filename from URL or use index
          // Prefix with issue identifier to prevent filename collisions across issues
          const urlParts = img.url.split("/");
          const rawFilename = img.alt || urlParts[urlParts.length - 1] || `comment_image_${i + 1}.png`;
          const filename = sanitizeFilename(`${data.issue.identifier}_${i + 1}_${rawFilename}`);
          const outputPath = join(outputDir, filename);

          const result = await downloadImage(img.url, outputPath);
          downloaded.push({
            index: i + 1,
            alt: img.alt,
            url: img.url,
            commentAuthor: img.commentAuthor,
            commentDate: img.commentDate,
            savedTo: outputPath,
            size: result.size,
            contentType: result.contentType,
          });
        } catch (error) {
          errors.push({
            index: i + 1,
            alt: img.alt,
            url: img.url,
            commentAuthor: img.commentAuthor,
            error: error.message,
          });
        }
      }

      return {
        issueId: data.issue.identifier,
        issueTitle: data.issue.title,
        commentsChecked: data.issue.comments.nodes.length,
        imagesFound: allImages.length,
        downloaded,
        errors: errors.length > 0 ? errors : undefined,
        outputDir,
      };
    }

    // ===== Uploads =====
    case "linear_upload_image": {
      const result = await uploadFileToLinear(args.filePath, args.filename);
      return {
        ...result,
        markdown: `![${result.filename}](${result.assetUrl})`,
        message: `Image uploaded successfully. Use this markdown to embed it: ![${result.filename}](${result.assetUrl})`,
      };
    }

    case "linear_create_comment_with_images": {
      const issueId = await resolveIssueId(args.issueId);

      // Upload all images first
      const uploaded = [];
      const uploadErrors = [];

      for (let i = 0; i < args.imagePaths.length; i++) {
        try {
          const result = await uploadFileToLinear(args.imagePaths[i]);
          uploaded.push({
            index: i + 1,
            filePath: args.imagePaths[i],
            ...result,
          });
        } catch (error) {
          uploadErrors.push({
            index: i + 1,
            filePath: args.imagePaths[i],
            error: error.message,
          });
        }
      }

      if (uploaded.length === 0) {
        throw new Error(`All image uploads failed: ${uploadErrors.map(e => e.error).join(", ")}`);
      }

      // Replace {image:N} placeholders with markdown image syntax
      let commentBody = args.body;
      for (const img of uploaded) {
        const placeholder = `{image:${img.index}}`;
        const markdown = `![${img.filename}](${img.assetUrl})`;
        commentBody = commentBody.split(placeholder).join(markdown);
      }

      // Create the comment
      const commentData = await linearQuery(`
        mutation($input: CommentCreateInput!) {
          commentCreate(input: $input) {
            success
            comment {
              id
              body
              createdAt
              user { name }
            }
          }
        }
      `, { input: { issueId, body: commentBody } });

      return {
        comment: commentData.commentCreate,
        imagesUploaded: uploaded.length,
        uploadErrors: uploadErrors.length > 0 ? uploadErrors : undefined,
        imageUrls: uploaded.map(img => ({ filename: img.filename, assetUrl: img.assetUrl })),
      };
    }

    // ===== Favorites =====
    case "linear_favorite_issue": {
      const issueId = await resolveIssueId(args.issueId);

      const data = await linearQuery(`
        mutation($input: FavoriteCreateInput!) {
          favoriteCreate(input: $input) {
            success
            favorite {
              id
            }
          }
        }
      `, { input: { issueId } });

      return data.favoriteCreate;
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
          serverInfo: { name: "linear-mcp-server", version: "2.0.0" },
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
