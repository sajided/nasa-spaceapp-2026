import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  allowedDevOrigins: ["192.168.1.111", "localhost:3000", "127.0.0.1:3000"],
};

export default nextConfig;
