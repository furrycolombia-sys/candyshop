---
name: agents-readme
description: Documentation for the agents folder (not an agent itself)
---

# Claude Agents

This folder contains custom agent configurations for specialized tasks.

## Structure

```
agents/
├── agent-name/
│   ├── AGENT.md          # Agent definition
│   └── prompts/          # Optional prompt templates
└── README.md             # This file
```

## Creating an Agent

1. Create a folder with the agent name
2. Add `AGENT.md` with the agent definition
3. Define the agent's purpose, tools, and behavior
4. Test with various scenarios

## Agent Definition Format

```markdown
# Agent Name

## Purpose

What the agent specializes in.

## Tools Available

- Tool 1
- Tool 2

## Behavior

How the agent should approach tasks.

## Examples

Example tasks and expected handling.
```

## Available Agents

| Agent                             | Purpose                                    |
| --------------------------------- | ------------------------------------------ |
| [mcp-first](./mcp-first/AGENT.md) | Enforces MCP tool usage over bash commands |
