import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname),
  turbopack: {
    root: path.join(__dirname),
  },
  serverExternalPackages: ["mammoth", "pdf-parse"],
};

export default nextConfig;
