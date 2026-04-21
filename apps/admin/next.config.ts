import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin(
  "./src/shared/infrastructure/i18n/request.ts",
);
const supabaseOrigin = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").origin;
  } catch {
    return "";
  }
})();
const supabaseSocketOrigin = (() => {
  if (!supabaseOrigin) return "";
  const parsed = new URL(supabaseOrigin);
  const socketProtocol = parsed.protocol === "https:" ? "wss:" : "ws:";
  return `${socketProtocol}//${parsed.host}`;
})();
const cspConnectSrc = [
  "'self'",
  "https://*.supabase.co",
  "wss://*.supabase.co",
  supabaseOrigin,
  supabaseSocketOrigin,
]
  .filter(Boolean)
  .join(" ");

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
    value: `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src ${cspConnectSrc} https://cloudflareinsights.com; frame-ancestors 'none'; object-src 'none';`,
  },
];

const isStandalone = process.env.STANDALONE === "true";
const basePathPrefix = process.env.BASE_PATH_PREFIX || "";
const allowedDevOrigins = ["admin.ffxivbe.org"];

const nextConfig: NextConfig = {
  allowedDevOrigins,
  // lucide-react v1.x ESM dist uses .ts imports — Turbopack needs explicit extensions
  turbopack: {
    resolveExtensions: [".ts", ".tsx", ".js", ".jsx", ".mjs", ".json"],
  },
  ...(isStandalone && {
    output: "standalone" as const,
    basePath: `${basePathPrefix}/admin`,
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
