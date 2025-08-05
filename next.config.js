/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Fix for chunk loading errors
  experimental: {
    workerThreads: false,
    cpus: 1
  },
  // Webpack configuration to handle chunk loading
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      config.optimization = {
        ...config.optimization,
        runtimeChunk: false,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: false,
            vendors: false,
            vendor: {
              chunks: 'all',
              name: 'vendor',
              test: /node_modules/,
            },
          },
        },
      }
    }
    return config
  },
}

module.exports = nextConfig
