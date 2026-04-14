# Claude Tools Configuration

This folder contains local MCP wrapper scripts and token templates used by `.mcp.json`.

## Setup

1. Copy `.env.local.example` to `.env.local`
2. Fill in your personal tokens
3. Restart Claude or any MCP-aware client

## Available Local Wrappers

The repository currently ships local wrappers for:

- `github-unified-mcp.mjs`
- `git-mcp.mjs`

`.mcp.json` also includes a disabled `github-setup` entry, but that wrapper is not shipped in this repo.

## Token Files

Wrappers look for tokens in this order:

1. Project root `.env.local`
2. `.claude/tools/.env.local`

The local `.env.local` file in this directory is gitignored. Keep secrets there or in the project root, not in tracked files.

## Troubleshooting

1. Verify the referenced wrapper files exist.
2. Verify `.env.local` contains the expected token names.
3. Restart the MCP client after changing tokens or `.mcp.json`.
