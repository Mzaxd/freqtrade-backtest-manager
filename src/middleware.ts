import createMiddleware from 'next-intl/middleware';
 
export default createMiddleware({
  // A list of all locales that are supported
  locales: ['en', 'zh'],
 
  // Used when no locale matches
  defaultLocale: 'en'
});
 
export const config = {
  // Match only internationalized pathnames
  matcher: [
    // Enable a redirect to a matching locale at the root
    '/',
 
    // Set a cookie to remember the previous locale for
    // all requests that have a locale prefix
    '/(zh|en)/:path*',
 
    // Enable redirects that add a locale prefix
    // (e.g. `/pathnames` -> `/en/pathnames`)
    '/((?!api|_next/static|_next/image|favicon.ico).*)'
  ]
};