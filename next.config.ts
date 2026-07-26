import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    unoptimized: true,
  },
  // archiver uses dynamic requires; keep it external so webpack doesn't bundle it
  // (it's traced into the standalone output and required at runtime).
  serverExternalPackages: ["archiver"],
};

export default nextConfig;
