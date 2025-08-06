import {notFound} from 'next/navigation';
import {getRequestConfig} from 'next-intl/server';
import {pathnames} from './navigation';
 
const locales = ['en', 'zh'];
 
export default getRequestConfig(async ({requestLocale}) => {
  const locale = await requestLocale;
  // Validate that the incoming `locale` parameter is valid
  if (!locales.includes(locale as any)) notFound();
 
  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
    pathnames
  };
});