import type { NextConfig } from "next";
import withNextIntl from 'next-intl/plugin';

const withIntl = withNextIntl('./src/i18n.ts');

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

export default withIntl(nextConfig);
