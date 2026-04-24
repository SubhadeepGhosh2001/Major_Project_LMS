/** @type {import('next').NextConfig}  */
const nextConfig = {
  images: {
    // In dev, remote image optimization can timeout and throw 500s.
    // This bypasses the optimizer while keeping remotePatterns for production.
    unoptimized: process.env.NODE_ENV === "development",
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.pexels.com",
        port: "",
        pathname: "/**",
      },
    ],
  },
};

module.exports = nextConfig;