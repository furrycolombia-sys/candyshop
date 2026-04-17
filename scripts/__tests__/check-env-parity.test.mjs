/**
 * Tests for scripts/check-env-parity.mjs exemption logic
 *
 * Strategy: Extract and test pure helper functions in isolation.
 * The script runs top-level code on import, so we replicate its logic here.
 *
 * Validates: Requirements 8.1, 8.2, 8.3, 8.4
 */

import { describe, it, expect } from "vitest";

// ─────────────────────────────────────────────────────────────────────────────
// Pure functions replicated from scripts/check-env-parity.mjs
// ─────────────────────────────────────────────────────────────────────────────

const EXEMPT_PREFIXES = [/^CLOUDFLARE_TUNNEL_/];

function isExempt(key) {
  return EXEMPT_PREFIXES.some((re) => re.test(key));
}

function parseKeys(content) {
  const keys = new Set();
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;
    keys.add(trimmed.slice(0, eqIndex).trim());
  }
  return keys;
}

/**
 * Builds key → Set<filename> map from { filename: fileContent } object.
 */
function buildKeyMap(fileContents) {
  const keyMap = new Map();
  for (const [name, content] of Object.entries(fileContents)) {
    for (const key of parseKeys(content)) {
      if (!keyMap.has(key)) keyMap.set(key, new Set());
      keyMap.get(key).add(name);
    }
  }
  return keyMap;
}

/**
 * Applies exemption logic and checks parity.
 * Returns { errors: Array<{key, missing}>, exemptCount: number }
 */
function checkParity(fileContents) {
  const envFiles = Object.keys(fileContents).sort();
  const keyMap = buildKeyMap(fileContents);

  let exemptCount = 0;
  for (const key of [...keyMap.keys()]) {
    if (isExempt(key)) {
      keyMap.delete(key);
      exemptCount++;
    }
  }

  const errors = [];
  for (const [key, presentIn] of [...keyMap.entries()].sort()) {
    if (presentIn.size === envFiles.length) continue;
    const missing = envFiles.filter((f) => !presentIn.has(f));
    errors.push({ key, missing });
  }

  return { errors, exemptCount };
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests: isExempt
// ─────────────────────────────────────────────────────────────────────────────

describe("isExempt", () => {
  it("returns true for CLOUDFLARE_TUNNEL_APP_ENABLED", () => {
    expect(isExempt("CLOUDFLARE_TUNNEL_APP_ENABLED")).toBe(true);
  });

  it("returns true for CLOUDFLARE_TUNNEL_SUPABASE_TOKEN", () => {
    expect(isExempt("CLOUDFLARE_TUNNEL_SUPABASE_TOKEN")).toBe(true);
  });

  it("returns true for any CLOUDFLARE_TUNNEL_* key", () => {
    expect(isExempt("CLOUDFLARE_TUNNEL_FOO_BAR")).toBe(true);
  });

  it("returns false for CLOUDFLARE_TOKEN (no TUNNEL_)", () => {
    expect(isExempt("CLOUDFLARE_TOKEN")).toBe(false);
  });

  it("returns false for regular keys", () => {
    expect(isExempt("NEXT_PUBLIC_SUPABASE_URL")).toBe(false);
    expect(isExempt("TARGET_ENV")).toBe(false);
    expect(isExempt("APPS_MODE")).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests: checkParity — exemption behavior
// ─────────────────────────────────────────────────────────────────────────────

describe("checkParity — CLOUDFLARE_TUNNEL_* exemption", () => {
  // Requirement 8.1, 8.3: CLOUDFLARE_TUNNEL_* keys only in some files → passes + exemptCount > 0
  it("8.1/8.3 — CLOUDFLARE_TUNNEL_* keys only in staging → passes with exemptCount > 0", () => {
    const files = {
      ".env.dev": "TARGET_ENV=dev\nAPPS_MODE=local\n",
      ".env.staging":
        "TARGET_ENV=staging\nAPPS_MODE=docker\nCLOUDFLARE_TUNNEL_APP_ENABLED=true\nCLOUDFLARE_TUNNEL_APP_TOKEN=abc\n",
      ".env.prod": "TARGET_ENV=prod\nAPPS_MODE=docker\n",
    };
    const { errors, exemptCount } = checkParity(files);
    expect(errors).toHaveLength(0);
    expect(exemptCount).toBe(2);
  });

  // Requirement 8.3: multiple CLOUDFLARE_TUNNEL_* keys across files → all counted
  it("8.3 — counts all CLOUDFLARE_TUNNEL_* keys across all files", () => {
    const files = {
      ".env.dev":
        "TARGET_ENV=dev\nCLOUDFLARE_TUNNEL_APP_ENABLED=false\nCLOUDFLARE_TUNNEL_APP_TOKEN=\n",
      ".env.staging":
        "TARGET_ENV=staging\nCLOUDFLARE_TUNNEL_APP_ENABLED=true\nCLOUDFLARE_TUNNEL_APP_TOKEN=tok\nCLOUDFLARE_TUNNEL_SUPABASE_ENABLED=true\nCLOUDFLARE_TUNNEL_SUPABASE_TOKEN=tok2\n",
    };
    const { errors, exemptCount } = checkParity(files);
    // APP_ENABLED, APP_TOKEN appear in both → 2 unique keys
    // SUPABASE_ENABLED, SUPABASE_TOKEN appear only in staging → 2 more unique keys
    // All 4 are exempt
    expect(errors).toHaveLength(0);
    expect(exemptCount).toBe(4);
  });

  // Requirement 8.2: non-tunnel key missing from one file → still fails
  it("8.2 — non-tunnel key missing from one file still causes a parity error", () => {
    const files = {
      ".env.dev":
        "TARGET_ENV=dev\nAPPS_MODE=local\nCLOUDFLARE_TUNNEL_APP_ENABLED=false\n",
      ".env.staging":
        "TARGET_ENV=staging\nCLOUDFLARE_TUNNEL_APP_ENABLED=true\n",
      // APPS_MODE missing from staging
    };
    const { errors, exemptCount } = checkParity(files);
    expect(errors.some((e) => e.key === "APPS_MODE")).toBe(true);
    expect(exemptCount).toBe(1); // CLOUDFLARE_TUNNEL_APP_ENABLED
  });

  // Requirement 8.4: no CLOUDFLARE_TUNNEL_* keys → exemptCount is 0
  it("8.4 — no CLOUDFLARE_TUNNEL_* keys → exemptCount is 0", () => {
    const files = {
      ".env.dev": "TARGET_ENV=dev\nAPPS_MODE=local\n",
      ".env.prod": "TARGET_ENV=prod\nAPPS_MODE=docker\n",
    };
    const { errors, exemptCount } = checkParity(files);
    expect(exemptCount).toBe(0);
    expect(errors).toHaveLength(0);
  });

  // Requirement 8.4: no CLOUDFLARE_TUNNEL_* keys with a real parity error → exemptCount is 0, error reported
  it("8.4 — no CLOUDFLARE_TUNNEL_* keys, parity error present → exemptCount 0, error reported", () => {
    const files = {
      ".env.dev": "TARGET_ENV=dev\nAPPS_MODE=local\nMISSING_KEY=value\n",
      ".env.prod": "TARGET_ENV=prod\nAPPS_MODE=docker\n",
    };
    const { errors, exemptCount } = checkParity(files);
    expect(exemptCount).toBe(0);
    expect(errors.some((e) => e.key === "MISSING_KEY")).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests: parseKeys
// ─────────────────────────────────────────────────────────────────────────────

describe("parseKeys", () => {
  it("parses simple KEY=VALUE lines", () => {
    const keys = parseKeys("FOO=bar\nBAZ=qux\n");
    expect(keys.has("FOO")).toBe(true);
    expect(keys.has("BAZ")).toBe(true);
  });

  it("ignores comment lines", () => {
    const keys = parseKeys("# comment\nFOO=bar\n");
    expect(keys.has("FOO")).toBe(true);
    expect(keys.size).toBe(1);
  });

  it("ignores blank lines", () => {
    const keys = parseKeys("\n\nFOO=bar\n\n");
    expect(keys.size).toBe(1);
  });

  it("handles empty values", () => {
    const keys = parseKeys("FOO=\n");
    expect(keys.has("FOO")).toBe(true);
  });
});
