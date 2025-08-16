import {createLocalizedPathnamesNavigation} from 'next-intl/navigation';

export const locales = ['en', 'zh'] as const;
export const localePrefix = 'always'; // Default

export const pathnames = {
  '/': '/',
  '/dashboard': '/dashboard',
  '/backtests': '/backtests',
  '/backtests/[id]': '/backtests/[id]',
  '/backtests/new': '/backtests/new',
  '/hyperopts': '/hyperopts',
  '/hyperopts/[id]': '/hyperopts/[id]',
  '/hyperopts/[id]/results': '/hyperopts/[id]/results',
  '/hyperopts/new': '/hyperopts/new',
  '/strategies': '/strategies',
  '/configs': '/configs',
  '/configs/[id]/edit': '/configs/[id]/edit',
  '/configs/new': '/configs/new',
  '/data': '/data',
};

export const {Link, redirect, usePathname, useRouter} =
  createLocalizedPathnamesNavigation({
    locales,
    localePrefix,
    pathnames
  });