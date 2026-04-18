import path from "node:path";

/**
 * Shared Vitest resolve.alias configuration for all apps.
 * Each app passes its own __dirname to resolve paths correctly.
 *
 * @param appDir - The app's directory (pass `__dirname` from vitest.config.ts)
 */
export function createVitestAliases(appDir: string) {
  const pkg = (pkgPath: string) =>
    path.resolve(appDir, "../../packages", pkgPath);

  return {
    "@": path.resolve(appDir, "./src"),
    "@shared": pkg("shared/src"),
    "@ui": pkg("ui/src"),
    "@api": pkg("api/src"),
    "@app-components": pkg("app-components/src"),
    shared: pkg("shared/src"),
    ui: pkg("ui/src"),
    api: pkg("api/src"),
    "@monorepo/app-components": pkg("app-components/src"),
  };
}
