import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const isProd = process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production";

const scriptSrc = ["'self'", "'unsafe-inline'"];
const scriptSrcElem = ["'self'", "'unsafe-inline'"];
const connectSrc = ["'self'", "https://*.ingest.sentry.io", "https://*.ingest.*.sentry.io"];
if (!isProd) {
  scriptSrc.push("https://vercel.live");
  scriptSrcElem.push("https://vercel.live");
  connectSrc.push("https://vercel.live", "wss://vercel.live", "wss://*.vercel.live");
}

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      `script-src ${scriptSrc.join(" ")}`,
      `script-src-elem ${scriptSrcElem.join(" ")}`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self'",
      `connect-src ${connectSrc.join(" ")}`,
      "frame-ancestors 'none'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
      {
        protocol: "https",
        hostname: "upload.wikimedia.org",
        pathname: "/**",
      },
    ],
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG ?? "",
  project: process.env.SENTRY_PROJECT ?? "",
  silent: !process.env.CI,
});
