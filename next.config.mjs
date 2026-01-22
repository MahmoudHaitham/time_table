/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  
  // Compiler optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  
  // Experimental features
  experimental: {
    optimizePackageImports: [
      'react-icons',
      'framer-motion',
      'lucide-react',
      '@radix-ui/react-accordion',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-hover-card',
      '@radix-ui/react-slot',
      '@radix-ui/react-tabs',
      '@radix-ui/react-tooltip',
    ],
  },
  
  typescript: {
    ignoreBuildErrors: true,
  },

  // Production optimizations
  productionBrowserSourceMaps: false,
  poweredByHeader: false,
  compress: true,
};

export default nextConfig;
