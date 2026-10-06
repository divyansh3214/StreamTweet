const configuredApiTarget = process.env.API_TARGET || (
  process.env.API_HOST ? `https://${process.env.API_HOST}` : "http://127.0.0.1:8000"
);

if (!/^https?:\/\//.test(configuredApiTarget)) {
  throw new Error("API_TARGET must be an HTTP or HTTPS URL; API_HOST must be a hostname.");
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: process.cwd(),
  allowedDevOrigins: ["127.0.0.1"],
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${configuredApiTarget}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
