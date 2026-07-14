/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    // Linting is run separately; don't block builds on it.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
