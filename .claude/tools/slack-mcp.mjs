#!/usr/bin/env node
/**
 * Slack MCP Server
 *
 * Provides Slack integration for Claude Code with explicit .env.local loading.
 * This is a wrapper around @modelcontextprotocol/server-slack that loads
 * credentials from .env.local files (project root or .claude/tools/).
 *
 * Requires SLACK_BOT_TOKEN and SLACK_TEAM_ID in .env.local
 */
/* global process */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..', '..');

// Load environment variables from .env.local
function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;

  const content = fs.readFileSync(filePath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    // Match SLACK_BOT_TOKEN or SLACK_TEAM_ID
    const match = trimmed.match(/^(SLACK_[A-Z_]+)=(.+)$/);
    if (match) {
      const key = match[1];
      // Only allow the specific variables we expect
      if (key !== 'SLACK_BOT_TOKEN' && key !== 'SLACK_TEAM_ID') {
        continue;
      }
      let value = match[2].trim();
      // Handle quoted values
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  }
}

// Load from both project root and tools directory
loadEnvFile(path.join(projectRoot, '.env.local'));
loadEnvFile(path.join(__dirname, '.env.local'));

// Validate required variables
const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
const SLACK_TEAM_ID = process.env.SLACK_TEAM_ID;

if (!SLACK_BOT_TOKEN || !SLACK_TEAM_ID) {
  console.error('Error: Missing required Slack credentials');
  if (!SLACK_BOT_TOKEN) console.error('  - SLACK_BOT_TOKEN not found');
  if (!SLACK_TEAM_ID) console.error('  - SLACK_TEAM_ID not found');
  console.error('');
  console.error('Please set them in .env.local or .claude/tools/.env.local');
  console.error('See .claude/docs/SLACK_MCP_SETUP.md for setup instructions');
  process.exit(1);
}

// Spawn the official Slack MCP server with loaded environment variables
const slackMcp = spawn('npx', ['-y', '@modelcontextprotocol/server-slack'], {
  env: {
    ...process.env,
    SLACK_BOT_TOKEN,
    SLACK_TEAM_ID,
  },
  stdio: 'inherit',
  shell: true, // Required for Windows to find npx
});

slackMcp.on('error', (error) => {
  console.error('Failed to start Slack MCP server:', error);
  process.exit(1);
});

slackMcp.on('close', (code) => {
  process.exit(code || 0);
});
