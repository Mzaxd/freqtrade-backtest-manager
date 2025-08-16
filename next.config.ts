import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  turbopack: {},
  async rewrites() {
    return [
      {
        source: '/plots/:path*',
        destination: '/api/plots/:path*',
      },
    ]
  },
};

export default withNextIntl(nextConfig);
