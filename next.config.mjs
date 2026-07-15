/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    // Linting is run separately; don't block builds on it.
    ignoreDuringBuilds: true,
  },
  // Keep @vercel/og out of the webpack bundle: Next's bundled copy mangles the
  // font asset URL on Windows (ERR_INVALID_URL on every ImageResponse), so the
  // OG routes import the standalone package and Node loads it natively.
  serverExternalPackages: ["@vercel/og"],
};

export default nextConfig;
