/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['postgres']
  },
  env: {
    DATABASE_URL: process.env.DATABASE_URL,
  }
}

module.exports = nextConfig
