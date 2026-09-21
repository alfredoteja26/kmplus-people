import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emit a self-contained server build so the Docker runtime image
  // only needs Node + the standalone output (small image, no dev deps).
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname),
  turbopack: {
    root: path.join(__dirname),
  },
  serverExternalPackages: ["mammoth", "pdf-parse"],
};

export default nextConfig;
