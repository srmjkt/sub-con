/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    tsconfigPath: "./tsconfig.json",
  },
  images: {
    remotePatterns: [],
  },
  // Disable 'X-Powered-By' header for security
  poweredByHeader: false,
};

export default nextConfig;