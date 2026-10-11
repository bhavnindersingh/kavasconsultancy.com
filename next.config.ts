import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dev-only badge. Bottom-left sat on top of the workspace sidebar's
  // "My account" link; it never renders in production.
  devIndicators: { position: "bottom-right" },
};

export default nextConfig;
