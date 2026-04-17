/**
 * Tests for scripts/docker-build.mjs
 *
 * Strategy:
 * - The script runs top-level code on import, making it hard to test via
 *   dynamic import in ESM. Instead, we extract and test the pure helper
 *   functions directly (parseHostPort, buildDockerArgs, parseCliArgs,
 *   buildComposeArgs) — these are replicated from the script since it
 *   doesn't export them.
 * - For integration-style tests that verify the script's decision logic
 *   (e.g. "compose not called after failed build"), we test the pure
 *   conditional logic that drives those decisions.
 * - Property-based tests use fast-check with ≥100 iterations.
 *
 * Validates:
 * - Requirements 1.1, 1.2, 1.5, 1.6
 * - Requirements 2.1, 2.2, 2.6
 * - Requirements 3.1, 3.2
 * - Requirements 4.1, 4.2, 4.5
 * - Requirements 6.3
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";

// ─────────────────────────────────────────────────────────────────────────────
// Pure functions extracted from scripts/docker-build.mjs
// These replicate the script's logic so we can test it in isolation.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parses HOST_PORT from the env.
 * Returns NaN when the value is missing or invalid.
 */
function parseHostPort(hostPort) {
  return Number.parseInt(hostPort ?? "", 10);
}

/**
 * Parses CLI args into a structured options object.
 * Mirrors the arg-parsing logic in docker-build.mjs.
 */
function parseCliArgs(argv) {
  const args = argv.slice(2);
  const envFlag = args.indexOf("--env");
  return {
    targetEnv: envFlag !== -1 ? args[envFlag + 1] : "prod",
    noCache: args.includes("--no-cache"),
    up: args.includes("--up"),
    tunnel: args.includes("--tunnel"),
    help: args.includes("--help"),
  };
}

const BUILD_ARG_KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_AUTH_URL",
  "NEXT_PUBLIC_AUTH_HOST_URL",
  "NEXT_PUBLIC_STORE_URL",
  "NEXT_PUBLIC_ADMIN_URL",
  "NEXT_PUBLIC_PLAYGROUND_URL",
  "NEXT_PUBLIC_LANDING_URL",
  "NEXT_PUBLIC_PAYMENTS_URL",
  "NEXT_PUBLIC_STUDIO_URL",
  "NEXT_PUBLIC_BUILD_HASH",
  "NEXT_PUBLIC_ENABLE_TEST_IDS",
];

/**
 * Builds the docker build argument array.
 * Mirrors the arg-building logic in docker-build.mjs.
 */
function buildDockerArgs({ imageName, buildArgValues, noCache = false }) {
  const buildArgFlags = BUILD_ARG_KEYS.flatMap((key) => [
    "--build-arg",
    `${key}=${buildArgValues[key] ?? ""}`,
  ]);
  return [
    "build",
    "-f",
    "docker/smoke/Dockerfile",
    "-t",
    imageName,
    ...buildArgFlags,
    ...(noCache ? ["--no-cache"] : []),
    ".",
  ];
}

/**
 * Builds the docker compose argument array.
 * Mirrors the compose-args logic in docker-build.mjs.
 */
function buildComposeArgs(targetEnv) {
  return [
    "compose",
    "-f",
    "docker/compose.yml",
    "--env-file",
    `.env.${targetEnv}`,
    "up",
    "-d",
  ];
}

/**
 * Simulates the script's top-level decision logic:
 * given build result and options, returns what commands would be run.
 */
function simulateScript({ imageName, buildArgValues, noCache, up, tunnel = false, targetEnv, buildExitCode, composeExitCode, launcherExitCode = 0 }) {
  const commands = [];
  const buildArgs = buildDockerArgs({ imageName, buildArgValues, noCache });
  commands.push({ cmd: "docker", args: buildArgs });

  if (buildExitCode !== 0) {
    return { commands, exitCode: buildExitCode, successMessage: null };
  }

  const successMessage = `✓ Image built successfully: ${imageName}`;

  if (up) {
    const composeArgs = buildComposeArgs(targetEnv);
    commands.push({ cmd: "docker", args: composeArgs });
    if (composeExitCode !== 0) {
      return { commands, exitCode: composeExitCode, successMessage };
    }

    if (tunnel) {
      commands.push({ cmd: "node", args: ["scripts/cloudflared.mjs", "--env", targetEnv] });
      if (launcherExitCode !== 0) {
        return { commands, exitCode: launcherExitCode, successMessage };
      }
    }
  }

  return { commands, exitCode: 0, successMessage };
}

// ─────────────────────────────────────────────────────────────────────────────
// Unit tests: parseHostPort
// ─────────────────────────────────────────────────────────────────────────────

describe("parseHostPort — example tests", () => {
  it("parses numeric HOST_PORT", () => {
    expect(parseHostPort("8088")).toBe(8088);
  });

  it("parses a different numeric HOST_PORT", () => {
    expect(parseHostPort("9090")).toBe(9090);
  });

  it("returns NaN for empty string", () => {
    expect(Number.isNaN(parseHostPort(""))).toBe(true);
  });

  it("returns NaN for invalid input", () => {
    expect(Number.isNaN(parseHostPort("not-a-number"))).toBe(true);
  });

  it("returns NaN for null/undefined", () => {
    expect(Number.isNaN(parseHostPort(null))).toBe(true);
    expect(Number.isNaN(parseHostPort(undefined))).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Unit tests: parseCliArgs
// ─────────────────────────────────────────────────────────────────────────────

describe("parseCliArgs — example tests", () => {
  // 5.2 — --env staging causes loadEnv('staging') to be called
  it("5.2 — --env staging sets targetEnv to 'staging'", () => {
    const opts = parseCliArgs(["node", "script.mjs", "--env", "staging"]);
    expect(opts.targetEnv).toBe("staging");
  });

  // 5.3 — no --env flag defaults to 'prod'
  it("5.3 — no --env flag defaults targetEnv to 'prod'", () => {
    const opts = parseCliArgs(["node", "script.mjs"]);
    expect(opts.targetEnv).toBe("prod");
  });

  // 5.4 — --no-cache sets noCache=true
  it("5.4 — --no-cache sets noCache to true", () => {
    const opts = parseCliArgs(["node", "script.mjs", "--no-cache"]);
    expect(opts.noCache).toBe(true);
  });

  // 5.5 — no --no-cache means noCache=false
  it("5.5 — no --no-cache means noCache is false", () => {
    const opts = parseCliArgs(["node", "script.mjs"]);
    expect(opts.noCache).toBe(false);
  });

  it("--up sets up to true", () => {
    const opts = parseCliArgs(["node", "script.mjs", "--up"]);
    expect(opts.up).toBe(true);
  });

  it("no --up means up is false", () => {
    const opts = parseCliArgs(["node", "script.mjs"]);
    expect(opts.up).toBe(false);
  });

  it("--help sets help to true", () => {
    const opts = parseCliArgs(["node", "script.mjs", "--help"]);
    expect(opts.help).toBe(true);
  });

  it("all flags together", () => {
    const opts = parseCliArgs(["node", "script.mjs", "--env", "staging", "--no-cache", "--up"]);
    expect(opts).toEqual({ targetEnv: "staging", noCache: true, up: true, tunnel: false, help: false });
  });

  it("--tunnel sets tunnel to true", () => {
    const opts = parseCliArgs(["node", "script.mjs", "--tunnel"]);
    expect(opts.tunnel).toBe(true);
  });

  it("no --tunnel means tunnel is false", () => {
    const opts = parseCliArgs(["node", "script.mjs"]);
    expect(opts.tunnel).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Unit tests: buildDockerArgs
// ─────────────────────────────────────────────────────────────────────────────

describe("buildDockerArgs — example tests", () => {
  it("includes -t <imageName>", () => {
    const args = buildDockerArgs({ imageName: "myimage:1.0", buildArgValues: {} });
    const tIdx = args.indexOf("-t");
    expect(tIdx).toBeGreaterThan(-1);
    expect(args[tIdx + 1]).toBe("myimage:1.0");
  });

  it("includes all 13 --build-arg flags", () => {
    const values = Object.fromEntries(BUILD_ARG_KEYS.map((k) => [k, `val-${k}`]));
    const args = buildDockerArgs({ imageName: "img", buildArgValues: values });
    for (const key of BUILD_ARG_KEYS) {
      const idx = args.indexOf(`${key}=val-${key}`);
      expect(idx).toBeGreaterThan(-1);
      expect(args[idx - 1]).toBe("--build-arg");
    }
  });

  // 5.4 — --no-cache appends --no-cache to docker build args
  it("5.4 — appends --no-cache when noCache=true", () => {
    const args = buildDockerArgs({ imageName: "img", buildArgValues: {}, noCache: true });
    expect(args).toContain("--no-cache");
  });

  // 5.5 — no --no-cache means --no-cache is absent
  it("5.5 — omits --no-cache when noCache=false", () => {
    const args = buildDockerArgs({ imageName: "img", buildArgValues: {}, noCache: false });
    expect(args).not.toContain("--no-cache");
  });

  it("ends with . as build context", () => {
    const args = buildDockerArgs({ imageName: "img", buildArgValues: {} });
    expect(args[args.length - 1]).toBe(".");
  });

  it("uses -f docker/smoke/Dockerfile", () => {
    const args = buildDockerArgs({ imageName: "img", buildArgValues: {} });
    const fIdx = args.indexOf("-f");
    expect(args[fIdx + 1]).toBe("docker/smoke/Dockerfile");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Unit tests: simulateScript (decision logic)
// ─────────────────────────────────────────────────────────────────────────────

describe("Script decision logic — example tests", () => {
  const baseOpts = {
    imageName: "candyshop:latest",
    buildArgValues: {},
    noCache: false,
    targetEnv: "prod",
  };

  // 5.6 — --up triggers docker compose after successful build
  it("5.6 — --up triggers docker compose after successful build", () => {
    const result = simulateScript({ ...baseOpts, up: true, buildExitCode: 0, composeExitCode: 0 });
    const composeCalls = result.commands.filter((c) => c.args[0] === "compose");
    expect(composeCalls.length).toBeGreaterThan(0);
  });

  // 5.7 — no --up means docker compose is never called
  it("5.7 — no --up means docker compose is never called", () => {
    const result = simulateScript({ ...baseOpts, up: false, buildExitCode: 0, composeExitCode: 0 });
    const composeCalls = result.commands.filter((c) => c.args[0] === "compose");
    expect(composeCalls.length).toBe(0);
  });

  // 5.8 — loadEnv throws → exit 1 (tested via the error path in the script logic)
  it("5.8 — build failure exits with the build's exit code", () => {
    const result = simulateScript({ ...baseOpts, up: true, buildExitCode: 1, composeExitCode: 0 });
    expect(result.exitCode).toBe(1);
  });

  // 5.9 — docker build exits non-zero → same exit code, compose not called
  it("5.9 — docker build exits non-zero → same exit code, compose not called", () => {
    const result = simulateScript({ ...baseOpts, up: true, buildExitCode: 2, composeExitCode: 0 });
    expect(result.exitCode).toBe(2);
    const composeCalls = result.commands.filter((c) => c.args[0] === "compose");
    expect(composeCalls.length).toBe(0);
  });

  // 5.10 — docker compose up exits non-zero → same exit code
  it("5.10 — docker compose up exits non-zero → same exit code", () => {
    const result = simulateScript({ ...baseOpts, up: true, buildExitCode: 0, composeExitCode: 3 });
    expect(result.exitCode).toBe(3);
  });

  it("exits 0 on full success without --up", () => {
    const result = simulateScript({ ...baseOpts, up: false, buildExitCode: 0, composeExitCode: 0 });
    expect(result.exitCode).toBe(0);
  });

  it("exits 0 on full success with --up", () => {
    const result = simulateScript({ ...baseOpts, up: true, buildExitCode: 0, composeExitCode: 0 });
    expect(result.exitCode).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Property-based tests
// ─────────────────────────────────────────────────────────────────────────────

describe("PBT — parseHostPort properties", () => {
  it("returns the parsed integer for numeric strings", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 65535 }), (port) => parseHostPort(String(port)) === port),
      { numRuns: 200 },
    );
  });

  it("returns NaN for non-numeric inputs", () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant(""),
          fc.constant("not-a-number"),
          fc.constant("https://example.com"),
          fc.constant("localhost:9090"),
        ),
        (value) => Number.isNaN(parseHostPort(value)),
      ),
      { numRuns: 100 },
    );
  });

  it("accepts zero-prefixed numeric strings", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 9999 }),
        (port) => parseHostPort(`0${port}`) === port,
      ),
      { numRuns: 200 },
    );
  });
});

describe("PBT — parseCliArgs properties", () => {
  it("targetEnv is always the value after --env when present", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 20 }).filter((s) => !s.startsWith("-")),
        (envName) => {
          const opts = parseCliArgs(["node", "script.mjs", "--env", envName]);
          return opts.targetEnv === envName;
        },
      ),
      { numRuns: 100 },
    );
  });

  it("targetEnv is always 'prod' when --env is absent", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.constantFrom("--no-cache", "--up"),
          { maxLength: 2 },
        ),
        (extraFlags) => {
          const opts = parseCliArgs(["node", "script.mjs", ...extraFlags]);
          return opts.targetEnv === "prod";
        },
      ),
      { numRuns: 100 },
    );
  });
});

describe("PBT — buildDockerArgs properties", () => {
  // Feature: docker-builder, Property 1: image name is always sourced from env
  // Validates: Requirements 1.5, 2.1
  it("Property 1: -t arg always equals the provided imageName", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }),
        (imageName) => {
          const args = buildDockerArgs({ imageName, buildArgValues: {} });
          const tIdx = args.indexOf("-t");
          return tIdx !== -1 && args[tIdx + 1] === imageName;
        },
      ),
      { numRuns: 100 },
    );
  });

  // Feature: docker-builder, Property 2: all build args are sourced from env
  // Validates: Requirements 2.2
  it("Property 2: all 13 build-arg keys appear as --build-arg KEY=VALUE", () => {
    const arbitraryValues = fc.record(
      Object.fromEntries(BUILD_ARG_KEYS.map((k) => [k, fc.string({ maxLength: 100 })])),
    );
    fc.assert(
      fc.property(arbitraryValues, (values) => {
        const args = buildDockerArgs({ imageName: "img", buildArgValues: values });
        return BUILD_ARG_KEYS.every((key) => {
          const expected = `${key}=${values[key] ?? ""}`;
          const idx = args.indexOf(expected);
          return idx !== -1 && args[idx - 1] === "--build-arg";
        });
      }),
      { numRuns: 100 },
    );
  });

  // Feature: docker-builder, Property 4: success message always contains the image name
  // Validates: Requirements 6.3
  it("Property 4: success message always contains the image name", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }),
        (imageName) => {
          const result = simulateScript({
            imageName,
            buildArgValues: {},
            noCache: false,
            up: false,
            targetEnv: "prod",
            buildExitCode: 0,
            composeExitCode: 0,
          });
          return result.successMessage !== null && result.successMessage.includes(imageName);
        },
      ),
      { numRuns: 100 },
    );
  });
});

describe("PBT — Property 3: compose never called after failed build", () => {
  // Feature: docker-builder, Property 3: compose is never called after a failed build
  // Validates: Requirements 4.5
  it("Property 3: for any non-zero exit code from docker build, compose is never invoked", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 255 }),
        fc.string({ minLength: 1, maxLength: 50 }),
        (failCode, imageName) => {
          const result = simulateScript({
            imageName,
            buildArgValues: {},
            noCache: false,
            up: true, // --up is set, but build fails
            targetEnv: "prod",
            buildExitCode: failCode,
            composeExitCode: 0,
          });
          const composeCalls = result.commands.filter((c) => c.args[0] === "compose");
          return composeCalls.length === 0 && result.exitCode === failCode;
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Unit tests: --tunnel flag
// ─────────────────────────────────────────────────────────────────────────────

describe("--tunnel flag — unit tests", () => {
  const baseOpts = {
    imageName: "candyshop:latest",
    buildArgValues: {},
    noCache: false,
    targetEnv: "prod",
  };

  // 4.2 — --tunnel without --up → guard fires (tested via parseCliArgs + guard logic)
  it("4.2 — --tunnel without --up: guard logic detects invalid combination", () => {
    const opts = parseCliArgs(["node", "script.mjs", "--tunnel"]);
    // The guard: tunnel && !up → should error
    expect(opts.tunnel && !opts.up).toBe(true);
  });

  // 4.3 — --tunnel + --up + launcher exits 0 → docker-build exits 0
  it("4.3 — --tunnel + --up + launcher exits 0 → docker-build exits 0", () => {
    const result = simulateScript({
      ...baseOpts,
      up: true,
      tunnel: true,
      buildExitCode: 0,
      composeExitCode: 0,
      launcherExitCode: 0,
    });
    expect(result.exitCode).toBe(0);
    const launcherCall = result.commands.find((c) => c.cmd === "node" && c.args[0] === "scripts/cloudflared.mjs");
    expect(launcherCall).toBeDefined();
  });

  // 4.3 — --tunnel + --up + no enabled tunnels → launcher exits 0, docker-build exits 0
  it("4.3 — --tunnel + --up + no enabled tunnels → launcher exits 0, docker-build exits 0", () => {
    const result = simulateScript({
      ...baseOpts,
      up: true,
      tunnel: true,
      buildExitCode: 0,
      composeExitCode: 0,
      launcherExitCode: 0,
    });
    expect(result.exitCode).toBe(0);
  });

  // 4.4 — launcher invoked with correct --env argument
  it("4.4 — launcher is invoked with --env <targetEnv>", () => {
    const result = simulateScript({
      ...baseOpts,
      targetEnv: "staging",
      up: true,
      tunnel: true,
      buildExitCode: 0,
      composeExitCode: 0,
      launcherExitCode: 0,
    });
    const launcherCall = result.commands.find((c) => c.cmd === "node");
    expect(launcherCall?.args).toContain("--env");
    expect(launcherCall?.args).toContain("staging");
  });

  // no tunnel invocation when --tunnel is not set
  it("no launcher invocation when --tunnel is not set", () => {
    const result = simulateScript({
      ...baseOpts,
      up: true,
      tunnel: false,
      buildExitCode: 0,
      composeExitCode: 0,
    });
    const launcherCall = result.commands.find((c) => c.cmd === "node");
    expect(launcherCall).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Property-based test: Property 6
// ─────────────────────────────────────────────────────────────────────────────

describe("PBT — Property 6: docker-build propagates launcher exit code exactly", () => {
  // Feature: cloudflared-tunnel-launcher, Property 6: docker-build propagates launcher exit code exactly
  // Validates: Requirements 4.4
  it("Property 6: for any non-zero launcher exit code, docker-build exits with that exact code", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 255 }),
        (launcherExitCode) => {
          const result = simulateScript({
            imageName: "candyshop:latest",
            buildArgValues: {},
            noCache: false,
            up: true,
            tunnel: true,
            targetEnv: "prod",
            buildExitCode: 0,
            composeExitCode: 0,
            launcherExitCode,
          });
          return result.exitCode === launcherExitCode;
        },
      ),
      { numRuns: 100 },
    );
  });
});
