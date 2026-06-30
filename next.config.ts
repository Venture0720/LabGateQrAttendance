import type { NextConfig } from "next";
const withPWA = require("next-pwa")({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
});

const isMobile = process.env.BUILD_TARGET === "mobile";

const nextConfig: NextConfig = {
  ...(isMobile ? { output: "export", trailingSlash: true } : {}),
  turbopack: {},
  images: {
    unoptimized: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default withPWA(nextConfig);
