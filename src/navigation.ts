import {createLocalizedPathnamesNavigation} from 'next-intl/navigation';

export const locales = ['en', 'zh'] as const;
export const localePrefix = 'always'; // Default

export const pathnames = {
  '/': '/',
  '/dashboard': '/dashboard',
  '/backtests': '/backtests',
  '/strategies': '/strategies',
  '/configs': '/configs',
};

export const {Link, redirect, usePathname, useRouter} =
  createLocalizedPathnamesNavigation({
    locales,
    localePrefix,
    pathnames
  });