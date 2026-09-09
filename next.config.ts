import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["nodemailer", "@neondatabase/serverless"],
};

export default nextConfig;
