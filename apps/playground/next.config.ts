import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

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
  {
    key: "Content-Security-Policy",
    value:
      "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self' https://*.supabase.co wss://*.supabase.co; frame-ancestors 'none'; object-src 'none';",
  },
];

const isStandalone = process.env.STANDALONE === "true";
const basePathPrefix = process.env.BASE_PATH_PREFIX || "";
const allowedDevOrigins = ["playground.ffxivbe.org"];

const nextConfig: NextConfig = {
  allowedDevOrigins,
  // lucide-react v1.x ESM dist uses .ts imports — Turbopack needs explicit extensions
  turbopack: {
    resolveExtensions: [".ts", ".tsx", ".js", ".jsx", ".mjs", ".json"],
  },
  ...(isStandalone && {
    output: "standalone" as const,
    basePath: `${basePathPrefix}/playground`,
  }),
  transpilePackages: [
    "ui",
    "shared",
    "api",
    "auth",
    "@monorepo/app-components",
  ],
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  async rewrites() {
    const backendUrl =
      process.env.NEXT_PUBLIC_API_BASE_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      "http://localhost:8000";
    return [
      { source: "/api/v1/:path*", destination: `${backendUrl}/api/v1/:path*` },
    ];
  },
};

export default withNextIntl(nextConfig);
