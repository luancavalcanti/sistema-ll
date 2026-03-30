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
        basePath: false, // 👈 Importante: impede que ele procure /sistema2/sistema2
        permanent: true,
      },
    ];
  },
};

export default nextConfig;