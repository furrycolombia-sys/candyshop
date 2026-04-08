import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { loadRootEnv } = require("../../scripts/load-root-env.js");
loadRootEnv();

const withNextIntl = createNextIntlPlugin(
  "./src/shared/infrastructure/i18n/request.ts",
);

const securityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-XSS-Protection", value: "1; mode=block" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

const basePathPrefix = process.env.BASE_PATH_PREFIX || "";
const allowedDevOrigins = [
  "landing.ffxivbe.org",
  "ffxivbe.org",
  "www.ffxivbe.org",
];

const nextConfig: NextConfig = {
  allowedDevOrigins,
  // lucide-react v1.x ESM dist uses .ts imports — Turbopack needs explicit extensions
  turbopack: {
    resolveExtensions: [".ts", ".tsx", ".js", ".jsx", ".mjs", ".json"],
  },
  // Landing serves at root "/" — no basePath for standard builds
  ...(process.env.STANDALONE === "true" && {
    output: "standalone" as const,
    ...(basePathPrefix && { basePath: basePathPrefix }),
  }),
  transpilePackages: ["api", "ui", "shared", "@monorepo/app-components"],
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default withNextIntl(nextConfig);
