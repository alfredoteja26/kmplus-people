import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Docker: emit a self-contained server build (Node + standalone output only).
  // Vercel builds its own functions, so skip it there.
  output: process.env.VERCEL ? undefined : "standalone",
  outputFileTracingRoot: path.join(__dirname),
  turbopack: {
    root: path.join(__dirname),
  },
  serverExternalPackages: ["mammoth", "pdf-parse"],
};

export default nextConfig;
