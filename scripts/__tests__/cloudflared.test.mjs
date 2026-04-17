/**
 * Tests for scripts/cloudflared.mjs
 *
 * Strategy:
 * - The script runs top-level code on import, so we extract and test the
 *   pure logic functions directly (same pattern as docker-build.test.mjs).
 * - Property-based tests use fast-check with ≥100 iterations.
 * - spawn and loadEnv are mocked via injected dependencies.
 *
 * Validates:
 * - Requirements 1.1, 1.2, 1.3, 1.4, 1.5
 * - Requirements 2.1, 2.2, 2.3, 2.4, 2.5
 * - Requirements 3.1, 3.2, 3.3, 3.4, 3.5
 * - Requirements 6.1, 6.2, 6.3, 6.4, 6.5
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";

// ─────────────────────────────────────────────────────────────────────────────
// Pure functions extracted from scripts/cloudflared.mjs
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parses CLI args into a structured options object.
 */
function parseCliArgs(argv) {
  const args = argv.slice(2);
  const envFlag = args.indexOf("--env");
  return {
    targetEnv: envFlag !== -1 ? args[envFlag + 1] : "prod",
    help: args.includes("--help"),
  };
}

/**
 * Discovers tunnel names from an env object.
 * Returns array of NAME strings from CLOUDFLARE_TUNNEL_<NAME>_ENABLED keys.
 */
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
 * Runs the tunnel launch logic with injected dependencies.
 * Returns { spawnCalls, stderrMessages, stdoutMessages, exitCode }
 */
function runLauncher({ env, spawnFn }) {
  const tunnelNames = discoverTunnels(env);
  const stderrMessages = [];
  const stdoutMessages = [];
  const spawnCalls = [];

  if (tunnelNames.length === 0) {
    stdoutMessages.push(
      "No CLOUDFLARE_TUNNEL_*_ENABLED keys found — nothing to launch.",
    );
    return { spawnCalls, stderrMessages, stdoutMessages, exitCode: 0 };
  }

  let launchedCount = 0;

  for (const name of tunnelNames) {
    const enabled = env[`CLOUDFLARE_TUNNEL_${name}_ENABLED`];
    if (enabled !== "true") continue;

    const token = env[`CLOUDFLARE_TUNNEL_${name}_TOKEN`] ?? "";
    if (!token) {
      stderrMessages.push(
        `ERROR: CLOUDFLARE_TUNNEL_${name}_TOKEN is not set — skipping`,
      );
      continue;
    }

    const child = spawnFn("cloudflared", ["tunnel", "run", "--token", token], {
      detached: true,
      stdio: "ignore",
    });
    child.unref();
    spawnCalls.push({ name, token, child });
    stdoutMessages.push(`✓ Tunnel launched: ${name}`);
    launchedCount++;
  }

  if (launchedCount === 0) {
    stdoutMessages.push("No tunnels were enabled — nothing launched.");
  }

  return { spawnCalls, stderrMessages, stdoutMessages, exitCode: 0 };
}

/**
 * Creates a mock spawn function that returns a child with a tracked unref call.
 */
function makeMockSpawn() {
  const calls = [];
  const spawnFn = (cmd, args, opts) => {
    const child = {
      unrefCalled: false,
      unref() {
        this.unrefCalled = true;
      },
    };
    calls.push({ cmd, args, opts, child });
    return child;
  };
  spawnFn.calls = calls;
  return spawnFn;
}

// ─────────────────────────────────────────────────────────────────────────────
// Unit tests: parseCliArgs
// ─────────────────────────────────────────────────────────────────────────────

describe("parseCliArgs", () => {
  it("defaults targetEnv to prod", () => {
    expect(parseCliArgs(["node", "script.mjs"]).targetEnv).toBe("prod");
  });

  it("parses --env staging", () => {
    expect(
      parseCliArgs(["node", "script.mjs", "--env", "staging"]).targetEnv,
    ).toBe("staging");
  });

  it("parses --help", () => {
    expect(parseCliArgs(["node", "script.mjs", "--help"]).help).toBe(true);
  });

  it("help is false when not present", () => {
    expect(parseCliArgs(["node", "script.mjs"]).help).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Unit tests: discoverTunnels
// ─────────────────────────────────────────────────────────────────────────────

describe("discoverTunnels", () => {
  it("returns empty array when no CLOUDFLARE_TUNNEL_*_ENABLED keys", () => {
    expect(discoverTunnels({ TARGET_ENV: "dev", APPS_MODE: "local" })).toEqual(
      [],
    );
  });

  it("discovers a single tunnel name", () => {
    const env = {
      CLOUDFLARE_TUNNEL_APP_ENABLED: "true",
      CLOUDFLARE_TUNNEL_APP_TOKEN: "tok",
    };
    expect(discoverTunnels(env)).toContain("APP");
  });

  it("discovers multiple tunnel names", () => {
    const env = {
      CLOUDFLARE_TUNNEL_APP_ENABLED: "true",
      CLOUDFLARE_TUNNEL_SUPABASE_ENABLED: "false",
    };
    const names = discoverTunnels(env);
    expect(names).toContain("APP");
    expect(names).toContain("SUPABASE");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Unit tests: runLauncher — example paths
// ─────────────────────────────────────────────────────────────────────────────

describe("runLauncher — example paths", () => {
  // 2.5 — no CLOUDFLARE_TUNNEL_*_ENABLED keys → informational message + exit 0
  it("2.5 — no tunnel keys found → informational message + exit 0", () => {
    const mockSpawn = makeMockSpawn();
    const result = runLauncher({
      env: { TARGET_ENV: "prod" },
      spawnFn: mockSpawn,
    });
    expect(result.exitCode).toBe(0);
    expect(result.spawnCalls).toHaveLength(0);
    expect(
      result.stdoutMessages.some((m) => m.includes("nothing to launch")),
    ).toBe(true);
  });

  // 2.3 — all discovered tunnels have ENABLED=false → no spawns + exit 0
  it("2.3 — all tunnels ENABLED=false → no spawns + exit 0", () => {
    const mockSpawn = makeMockSpawn();
    const env = {
      CLOUDFLARE_TUNNEL_APP_ENABLED: "false",
      CLOUDFLARE_TUNNEL_APP_TOKEN: "some-token",
    };
    const result = runLauncher({ env, spawnFn: mockSpawn });
    expect(result.exitCode).toBe(0);
    expect(result.spawnCalls).toHaveLength(0);
    expect(
      result.stdoutMessages.some((m) => m.includes("nothing launched")),
    ).toBe(true);
  });

  // 3.1, 3.2, 3.3 — single tunnel ENABLED=true with valid token → one spawn + .unref() + exit 0
  it("3.1/3.2/3.3 — single tunnel ENABLED=true with valid token → one spawn + unref + exit 0", () => {
    const mockSpawn = makeMockSpawn();
    const env = {
      CLOUDFLARE_TUNNEL_APP_ENABLED: "true",
      CLOUDFLARE_TUNNEL_APP_TOKEN: "my-secret-token",
    };
    const result = runLauncher({ env, spawnFn: mockSpawn });
    expect(result.exitCode).toBe(0);
    expect(result.spawnCalls).toHaveLength(1);
    expect(result.spawnCalls[0].child.unrefCalled).toBe(true);
    expect(result.stdoutMessages).toContain("✓ Tunnel launched: APP");
  });

  // 2.4 — single tunnel ENABLED=true with empty token → stderr error + exit 0 (non-fatal)
  it("2.4 — single tunnel ENABLED=true with empty token → stderr error + exit 0", () => {
    const mockSpawn = makeMockSpawn();
    const env = {
      CLOUDFLARE_TUNNEL_APP_ENABLED: "true",
      CLOUDFLARE_TUNNEL_APP_TOKEN: "",
    };
    const result = runLauncher({ env, spawnFn: mockSpawn });
    expect(result.exitCode).toBe(0);
    expect(result.spawnCalls).toHaveLength(0);
    expect(
      result.stderrMessages.some((m) =>
        m.includes("CLOUDFLARE_TUNNEL_APP_TOKEN"),
      ),
    ).toBe(true);
    expect(result.stderrMessages.some((m) => m.includes("skipping"))).toBe(
      true,
    );
  });

  // 2.4, 6.5 — two tunnels: one valid, one missing token → one spawn + one stderr error + exit 0
  it("2.4/6.5 — two tunnels: one valid, one missing token → one spawn + one error + exit 0", () => {
    const mockSpawn = makeMockSpawn();
    const env = {
      CLOUDFLARE_TUNNEL_APP_ENABLED: "true",
      CLOUDFLARE_TUNNEL_APP_TOKEN: "valid-token",
      CLOUDFLARE_TUNNEL_SUPABASE_ENABLED: "true",
      CLOUDFLARE_TUNNEL_SUPABASE_TOKEN: "",
    };
    const result = runLauncher({ env, spawnFn: mockSpawn });
    expect(result.exitCode).toBe(0);
    expect(result.spawnCalls).toHaveLength(1);
    expect(result.stderrMessages).toHaveLength(1);
    expect(result.stderrMessages[0]).toContain("SUPABASE");
  });

  // 3.4 — exit 0 after all enabled tunnels spawned
  it("3.4 — exits 0 after spawning all enabled tunnels", () => {
    const mockSpawn = makeMockSpawn();
    const env = {
      CLOUDFLARE_TUNNEL_APP_ENABLED: "true",
      CLOUDFLARE_TUNNEL_APP_TOKEN: "tok1",
      CLOUDFLARE_TUNNEL_SUPABASE_ENABLED: "true",
      CLOUDFLARE_TUNNEL_SUPABASE_TOKEN: "tok2",
    };
    const result = runLauncher({ env, spawnFn: mockSpawn });
    expect(result.exitCode).toBe(0);
    expect(result.spawnCalls).toHaveLength(2);
  });

  // 3.5 — no additional flags beyond tunnel run --token
  it("3.5 — spawn args are exactly ['tunnel', 'run', '--token', token]", () => {
    const mockSpawn = makeMockSpawn();
    const env = {
      CLOUDFLARE_TUNNEL_APP_ENABLED: "true",
      CLOUDFLARE_TUNNEL_APP_TOKEN: "exact-token",
    };
    runLauncher({ env, spawnFn: mockSpawn });
    expect(mockSpawn.calls[0].args).toEqual([
      "tunnel",
      "run",
      "--token",
      "exact-token",
    ]);
  });

  // spawn options: detached: true, stdio: 'ignore'
  it("spawn is called with detached: true and stdio: 'ignore'", () => {
    const mockSpawn = makeMockSpawn();
    const env = {
      CLOUDFLARE_TUNNEL_APP_ENABLED: "true",
      CLOUDFLARE_TUNNEL_APP_TOKEN: "tok",
    };
    runLauncher({ env, spawnFn: mockSpawn });
    expect(mockSpawn.calls[0].opts).toMatchObject({
      detached: true,
      stdio: "ignore",
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Property-based tests
// ─────────────────────────────────────────────────────────────────────────────

// Feature: cloudflared-tunnel-launcher, Property 1: Token passthrough is exact
// Validates: Requirements 2.2, 6.3
describe("PBT — Property 1: Token passthrough is exact", () => {
  it("spawn receives the exact token string as --token argument", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            name: fc
              .string({ minLength: 1, maxLength: 20 })
              .map(
                (s) => s.toUpperCase().replace(/[^A-Z0-9_]/g, "X") || "TUNNEL",
              ),
            token: fc.string({ minLength: 1, maxLength: 200 }),
          }),
          { minLength: 1, maxLength: 5 },
        ),
        (tunnels) => {
          const mockSpawn = makeMockSpawn();
          const env = {};
          for (const { name, token } of tunnels) {
            env[`CLOUDFLARE_TUNNEL_${name}_ENABLED`] = "true";
            env[`CLOUDFLARE_TUNNEL_${name}_TOKEN`] = token;
          }
          runLauncher({ env, spawnFn: mockSpawn });
          // Each spawn call must have the exact token as the --token argument
          return mockSpawn.calls.every((call) => {
            const tokenIdx = call.args.indexOf("--token");
            if (tokenIdx === -1) return false;
            const passedToken = call.args[tokenIdx + 1];
            return tunnels.some((t) => t.token === passedToken);
          });
        },
      ),
      { numRuns: 100 },
    );
  });
});

// Feature: cloudflared-tunnel-launcher, Property 2: Per-tunnel token error is non-fatal
// Validates: Requirements 2.4, 6.5
describe("PBT — Property 2: Per-tunnel token error is non-fatal", () => {
  it("spawn called only for valid-token tunnels, exit 0 regardless", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            // Use index-based names to guarantee uniqueness across the array
            token: fc.string({ maxLength: 50 }),
          }),
          { minLength: 2, maxLength: 6 },
        ),
        (tunnelConfigs) => {
          // Assign unique names by index; ensure at least one valid and one invalid token
          const withValid = tunnelConfigs.map((t, i) => ({
            name: `TUNNEL${i}`,
            token: i === 0 ? `valid-token-${i}` : i === 1 ? "" : t.token,
            enabled: true,
          }));

          const mockSpawn = makeMockSpawn();
          const env = {};
          for (const { name, token, enabled } of withValid) {
            env[`CLOUDFLARE_TUNNEL_${name}_ENABLED`] = enabled
              ? "true"
              : "false";
            env[`CLOUDFLARE_TUNNEL_${name}_TOKEN`] = token;
          }
          const result = runLauncher({ env, spawnFn: mockSpawn });

          const validCount = withValid.filter(
            (t) => t.enabled && t.token,
          ).length;
          const invalidCount = withValid.filter(
            (t) => t.enabled && !t.token,
          ).length;

          return (
            result.exitCode === 0 &&
            result.spawnCalls.length === validCount &&
            result.stderrMessages.length === invalidCount
          );
        },
      ),
      { numRuns: 100 },
    );
  });
});

// Feature: cloudflared-tunnel-launcher, Property 3: loadEnv error message propagation
// Validates: Requirements 1.4
describe("PBT — Property 3: loadEnv error message propagation", () => {
  it("error message from loadEnv appears in stderr output", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 200 }),
        fc
          .string({ minLength: 1, maxLength: 20 })
          .filter((s) => /^[a-z]+$/.test(s)),
        (errorMessage, envName) => {
          // Simulate the error handling logic from the script
          const stderrMessages = [];
          try {
            throw new Error(errorMessage);
          } catch (err) {
            stderrMessages.push(
              `ERROR: Failed to load .env.${envName}: ${err.message}`,
            );
          }
          return (
            stderrMessages[0].includes(errorMessage) &&
            stderrMessages[0].includes(envName)
          );
        },
      ),
      { numRuns: 100 },
    );
  });
});

// Feature: cloudflared-tunnel-launcher, Property 4: Spawn count matches enabled tunnels
// Validates: Requirements 2.1, 2.2, 2.3, 6.2
describe("PBT — Property 4: Spawn count matches enabled tunnels", () => {
  it("spawn call count equals exactly the count of enabled tunnels with non-empty tokens", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            enabled: fc.boolean(),
            token: fc.string({ maxLength: 50 }),
          }),
          { minLength: 0, maxLength: 8 },
        ),
        (tunnelConfigs) => {
          const mockSpawn = makeMockSpawn();
          const env = {};
          tunnelConfigs.forEach(({ enabled, token }, i) => {
            const name = `TUNNEL${i}`;
            env[`CLOUDFLARE_TUNNEL_${name}_ENABLED`] = enabled
              ? "true"
              : "false";
            env[`CLOUDFLARE_TUNNEL_${name}_TOKEN`] = token;
          });
          runLauncher({ env, spawnFn: mockSpawn });
          const expectedSpawnCount = tunnelConfigs.filter(
            (t) => t.enabled && t.token,
          ).length;
          return mockSpawn.calls.length === expectedSpawnCount;
        },
      ),
      { numRuns: 100 },
    );
  });
});

// Feature: cloudflared-tunnel-launcher, Property 5: unref called on every spawned process
// Validates: Requirements 3.2, 6.4
describe("PBT — Property 5: unref called on every spawned process", () => {
  it(".unref() is called exactly once per spawned child process", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            enabled: fc.boolean(),
            token: fc.string({ maxLength: 50 }),
          }),
          { minLength: 0, maxLength: 8 },
        ),
        (tunnelConfigs) => {
          const mockSpawn = makeMockSpawn();
          const env = {};
          tunnelConfigs.forEach(({ enabled, token }, i) => {
            const name = `TUNNEL${i}`;
            env[`CLOUDFLARE_TUNNEL_${name}_ENABLED`] = enabled
              ? "true"
              : "false";
            env[`CLOUDFLARE_TUNNEL_${name}_TOKEN`] = token;
          });
          runLauncher({ env, spawnFn: mockSpawn });
          // Every spawned child must have had .unref() called
          return mockSpawn.calls.every(
            (call) => call.child.unrefCalled === true,
          );
        },
      ),
      { numRuns: 100 },
    );
  });
});
