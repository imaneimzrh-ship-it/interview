/** @type {import('next').NextConfig} */
module.exports = {
  experimental: { serverActions: { allowedOrigins: ['sonneai.com', 'localhost:3000'] } },
  // pdf-parse reads test fixtures from disk at require() time — webpack breaks this.
  // Marking it external forces Next.js to load it via Node require() instead.
  serverExternalPackages: ['pdf-parse'],
}
