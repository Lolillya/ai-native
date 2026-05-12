import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Turbopack is the default bundler in Next.js 16.
  // y-webrtc is dynamically imported client-side only (ssr: false),
  // so no Node built-in polyfills are needed at bundle time.
  turbopack: {},
};

export default nextConfig;
