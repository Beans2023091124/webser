/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      // Uploads travel through a Server Action, whose default body cap is 1MB.
      // Vercel's own limit for a serverless request body is 4.5MB, so there is
      // no point asking for more than that here: anything larger has to skip
      // the server and go straight to Blob storage from the browser.
      bodySizeLimit: "4mb",
    },
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
};

module.exports = nextConfig;
