import type { NextConfig } from "next";
import withNextIntl from 'next-intl/plugin';

const withIntl = withNextIntl('./src/i18n.ts');

const nextConfig: NextConfig = {
  turbopack: {},
};

export default withIntl(nextConfig);
