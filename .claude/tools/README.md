# Claude Tools Configuration

This folder contains MCP (Model Context Protocol) server configurations and related tooling.

## Setup

1. Copy `.env.local.example` to `.env.local`
2. Fill in your personal tokens
3. Restart Claude Code session

## Token Security

- `.env.local` is gitignored - never commit tokens
- Each developer maintains their own tokens
- See `.env.local.example` for required tokens

## MCP Servers

MCP servers are configured in `/.mcp.json` at project root.

### Available Servers

| Server             | Purpose                                | Token Required |
| ------------------ | -------------------------------------- | -------------- |
| github-unified-mcp | GitHub operations (PRs, issues, repos) | GITHUB_TOKEN   |

## Troubleshooting

If MCP tools aren't working:

1. Verify `.env.local` exists with valid tokens
2. Restart Claude Code session
3. Check `/.mcp.json` configuration
