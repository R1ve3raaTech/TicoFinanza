import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next 16 loguea los argumentos de las Server Functions por defecto, que
  // acá son montos y descripciones de movimientos de gente real.
  logging: {
    serverFunctions: false,
    incomingRequests: { ignore: [/\/auth\//] },
  },
  images: {
    remotePatterns: [
      { hostname: "lh3.googleusercontent.com" },
      { hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
