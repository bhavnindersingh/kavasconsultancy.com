import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dev-only badge. Bottom-left sat on top of the workspace sidebar's
  // "My account" link; it never renders in production.
  devIndicators: { position: "bottom-right" },
  // Quiet dev terminal: no line per request or per server action, and only
  // browser errors (not warnings) forwarded. Dev-only; production is unaffected.
  logging: {
    incomingRequests: false,
    serverFunctions: false,
    browserToTerminal: "error",
  },
};

export default nextConfig;
