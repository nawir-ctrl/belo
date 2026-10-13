/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["adm-zip", "@prisma/client"],
  },
};

export default nextConfig;
