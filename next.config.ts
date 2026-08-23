import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {};

// Serwist's webpack hook clashes with Turbopack dev; the service worker is
// production-only anyway (build runs with --webpack).
export default process.env.NODE_ENV === "development"
  ? nextConfig
  : withSerwist(nextConfig);
