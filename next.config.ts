import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins: ['10.0.0.89'],
  reactCompiler: true,
  basePath: '/sistema2',

  async redirects() {
    return [
      {
        source: '/',
        destination: '/sistema2',
        basePath: false,
        permanent: true,
      },
    ];
  },
};

export default nextConfig;