/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  transpilePackages: ["@hookscope/ui", "@hookscope/db"],
}

export default nextConfig
