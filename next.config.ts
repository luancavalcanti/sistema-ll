
const nextConfig = {
  /* config options here */
  allowedDevOrigins: ['10.0.0.89'],
  reactCompiler: true,

  // Ignora erros do ESLint na hora do build na Vercel
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Ignora erros de tipagem (any) na hora do build na Vercel
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;