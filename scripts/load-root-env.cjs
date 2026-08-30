/**
 * CJS shim for load-root-env — delegates to load-env.mjs.
 *
 * Playwright configs and app-url-resolver.js use require() so they need a
 * synchronous CJS entry point, while load-env.mjs is an ESM module. This
 * works as a real delegation (not a duplicate reimplementation) because
 * Node's synchronous `require(esm)` support — stable and unflagged since
 * Node 22.12 — lets CJS `require()` an ESM file directly and get back its
 * exports immediately, with no `await import()` needed. Every consumer
 * here runs on Node 24 (see .nvmrc / CI's NODE_VERSION), well past that
 * floor.
 *
 * Do NOT re-implement env-file parsing or $secret: resolution here — call
 * straight into loadEnv() so this file and load-env.mjs cannot drift, the
 * way this shim's own hand-duplicated copy previously did (it silently
 * resolved a missing CI secret to "" instead of throwing, unlike
 * load-env.mjs's strict CI branch).
 *
 * Usage (existing callers):
 *   const { loadRootEnv } = require('./load-root-env.cjs');
 *   loadRootEnv({ targetEnv: 'staging' });
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { loadEnv } = require("./load-env.mjs");

/**
 * Load .env.<targetEnv> into process.env, resolving $secret: references.
 * Thin adapter over loadEnv() — see load-env.mjs for the full contract
 * (CI-secret strictness, allowed env names, ENV_DEBUG snapshot behavior).
 *
 * @param {{ targetEnv?: string }} [opts]
 */
function loadRootEnv(opts) {
  loadEnv(opts && opts.targetEnv);
}

module.exports = { loadRootEnv };
