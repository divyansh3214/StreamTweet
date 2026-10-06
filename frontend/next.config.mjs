const apiTarget = process.env.API_TARGET || "http://127.0.0.1:8000";

if (!/^https?:\/\//.test(apiTarget)) {
  throw new Error("API_TARGET must be an HTTP or HTTPS URL.");
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: process.cwd(),
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiTarget}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
