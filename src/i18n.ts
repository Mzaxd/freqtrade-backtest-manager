import {notFound} from 'next/navigation';
import {getRequestConfig} from 'next-intl/server';
import {pathnames} from './navigation';

const locales = ['en', 'zh'];

export default getRequestConfig(async ({requestLocale}) => {
  // This can either be defined statically at the top-level if your locale
  // can be determined from `headers()` or `cookies()`, or alternatively
  // read from the URL
  const locale = await requestLocale;

  // Validate that the incoming `locale` parameter is valid
  if (!locale || !locales.includes(locale as any)) {
    notFound();
  }

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
    pathnames
  };
});