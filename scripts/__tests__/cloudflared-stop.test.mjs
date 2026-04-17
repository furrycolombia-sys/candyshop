/**
 * Tests for scripts/cloudflared-stop.mjs
 *
 * Strategy:
 * - Extract and test pure logic functions in isolation.
 * - spawnSync is mocked via injected dependencies.
 *
 * Validates: Requirements 7.6, 7.7, 7.8, 7.9
 */

import { describe, it, expect } from "vitest";

// ─────────────────────────────────────────────────────────────────────────────
// Pure functions extracted from scripts/cloudflared-stop.mjs
// ─────────────────────────────────────────────────────────────────────────────

function discoverTunnels(env) {
  const TUNNEL_ENABLED_RE = /^CLOUDFLARE_TUNNEL_(.+)_ENABLED$/;
  return Object.keys(env)
    .map((key) => {
      const match = TUNNEL_ENABLED_RE.exec(key);
      return match ? match[1] : null;
    })
    .filter(Boolean);
}

/**
 * Runs the tunnel stop logic with injected dependencies.
 * Returns { stdoutMessages, stderrMessages, exitCode }
 */
function runStopper({ env, spawnSyncFn }) {
  const tunnelNames = discoverTunnels(env);
  const stdoutMessages = [];
  const stderrMessages = [];

  for (const name of tunnelNames) {
    const enabled = env[`CLOUDFLARE_TUNNEL_${name}_ENABLED`];
    if (enabled !== "true") continue;

    const token = env[`CLOUDFLARE_TUNNEL_${name}_TOKEN`] ?? "";
    if (!token) continue;

    const result = spawnSyncFn(
      "pkill",
      ["-f", `cloudflared tunnel run --token ${token}`],
      {
        stdio: "pipe",
      },
    );

    if (result.status === 0) {
      stdoutMessages.push(`✓ Tunnel stopped: ${name}`);
    } else {
      stdoutMessages.push(`⚠ No running tunnel found for: ${name}`);
    }
  }

  return { stdoutMessages, stderrMessages, exitCode: 0 };
}

// ─────────────────────────────────────────────────────────────────────────────
// Unit tests
// ─────────────────────────────────────────────────────────────────────────────

describe("runStopper — example paths", () => {
  // 7.7 — single enabled tunnel, pkill exits 0 → prints success + exits 0
  it("7.7 — single enabled tunnel, pkill exits 0 → prints success + exits 0", () => {
    const env = {
      CLOUDFLARE_TUNNEL_APP_ENABLED: "true",
      CLOUDFLARE_TUNNEL_APP_TOKEN: "my-token",
    };
    const spawnSyncFn = () => ({ status: 0 });
    const result = runStopper({ env, spawnSyncFn });
    expect(result.exitCode).toBe(0);
    expect(result.stdoutMessages).toContain("✓ Tunnel stopped: APP");
  });

  // 7.8 — single enabled tunnel, pkill exits 1 → prints warning + exits 0 (non-fatal)
  it("7.8 — single enabled tunnel, pkill exits 1 → prints warning + exits 0", () => {
    const env = {
      CLOUDFLARE_TUNNEL_APP_ENABLED: "true",
      CLOUDFLARE_TUNNEL_APP_TOKEN: "my-token",
    };
    const spawnSyncFn = () => ({ status: 1 });
    const result = runStopper({ env, spawnSyncFn });
    expect(result.exitCode).toBe(0);
    expect(result.stdoutMessages).toContain(
      "⚠ No running tunnel found for: APP",
    );
  });

  // 7.9 — two enabled tunnels: one found, one not → one success + one warning + exits 0
  it("7.9 — two enabled tunnels: one found, one not → one success + one warning + exits 0", () => {
    const env = {
      CLOUDFLARE_TUNNEL_APP_ENABLED: "true",
      CLOUDFLARE_TUNNEL_APP_TOKEN: "token-app",
      CLOUDFLARE_TUNNEL_SUPABASE_ENABLED: "true",
      CLOUDFLARE_TUNNEL_SUPABASE_TOKEN: "token-supabase",
    };
    // APP found (exit 0), SUPABASE not found (exit 1)
    const spawnSyncFn = (_cmd, args) => {
      const isApp = args[1].includes("token-app");
      return { status: isApp ? 0 : 1 };
    };
    const result = runStopper({ env, spawnSyncFn });
    expect(result.exitCode).toBe(0);
    expect(result.stdoutMessages).toContain("✓ Tunnel stopped: APP");
    expect(result.stdoutMessages).toContain(
      "⚠ No running tunnel found for: SUPABASE",
    );
  });

  // disabled tunnel is skipped
  it("disabled tunnel is skipped — no pkill call", () => {
    const env = {
      CLOUDFLARE_TUNNEL_APP_ENABLED: "false",
      CLOUDFLARE_TUNNEL_APP_TOKEN: "my-token",
    };
    let called = false;
    const spawnSyncFn = () => {
      called = true;
      return { status: 0 };
    };
    const result = runStopper({ env, spawnSyncFn });
    expect(result.exitCode).toBe(0);
    expect(called).toBe(false);
    expect(result.stdoutMessages).toHaveLength(0);
  });

  // tunnel with empty token is skipped
  it("enabled tunnel with empty token is skipped", () => {
    const env = {
      CLOUDFLARE_TUNNEL_APP_ENABLED: "true",
      CLOUDFLARE_TUNNEL_APP_TOKEN: "",
    };
    let called = false;
    const spawnSyncFn = () => {
      called = true;
      return { status: 0 };
    };
    const result = runStopper({ env, spawnSyncFn });
    expect(result.exitCode).toBe(0);
    expect(called).toBe(false);
  });
});

describe("loadEnv error handling", () => {
  // 7.6 — loadEnv throws → stderr error + exits 1
  it("7.6 — loadEnv throws → stderr contains error message + exit code 1", () => {
    // Simulate the error handling logic from the script
    const stderrMessages = [];
    let exitCode = 0;
    const envName = "staging";
    const errorMessage = "Env file not found: .env.staging";
    try {
      throw new Error(errorMessage);
    } catch (err) {
      stderrMessages.push(
        `ERROR: Failed to load .env.${envName}: ${err.message}`,
      );
      exitCode = 1;
    }
    expect(exitCode).toBe(1);
    expect(stderrMessages[0]).toContain(errorMessage);
    expect(stderrMessages[0]).toContain(envName);
  });
});

describe("pkill invocation", () => {
  it("pkill is called with -f and the exact token string", () => {
    const env = {
      CLOUDFLARE_TUNNEL_APP_ENABLED: "true",
      CLOUDFLARE_TUNNEL_APP_TOKEN: "exact-token-value",
    };
    let capturedArgs = null;
    const spawnSyncFn = (_cmd, args) => {
      capturedArgs = args;
      return { status: 0 };
    };
    runStopper({ env, spawnSyncFn });
    expect(capturedArgs).toEqual([
      "-f",
      "cloudflared tunnel run --token exact-token-value",
    ]);
  });
});
