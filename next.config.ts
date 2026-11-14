import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // O áudio do Comando de voz (até 30 s) viaja numa Server Action.
  experimental: { serverActions: { bodySizeLimit: "2mb" } },
};

export default nextConfig;
