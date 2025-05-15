import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    domains: ['localhost', 'submint.vercel.app', 'images.pexels.com','purple-historic-bird-762.mypinata.cloud','encrypted-tbn0.gstatic.com', 'suonyyhangpwrbbautkb.supabase.co'],
  },
  eslint: {
    ignoreDuringBuilds: true,
},
};

export default nextConfig;
