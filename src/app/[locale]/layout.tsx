import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import '@/app/globals.css'
import { ReactQueryProvider } from '@/components/providers/react-query-provider'
import { Toaster } from 'react-hot-toast'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages, unstable_setRequestLocale } from 'next-intl/server'
import { Navigation } from '@/components/Navigation'
import { ThemeProvider } from '@/components/providers/theme-provider'
import { ThemeSwitcher } from '@/components/ThemeSwitcher'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Freqtrade 回测管理器',
  description: 'Freqtrade 可视化回测平台',
}

export function generateStaticParams() {
  return [{locale: 'en'}, {locale: 'zh'}];
}

type Props = {
  children: React.ReactNode;
  params: {locale: string};
};

export default async function RootLayout({children, params}: Props) {
  const { locale } = await params;
  const messages = await getMessages();
 
  return (
    <html lang={locale}>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <NextIntlClientProvider locale={locale} messages={messages}>
            <ReactQueryProvider>
              <Toaster position="top-center" reverseOrder={false} />
              <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
                <nav className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700">
                  <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                      <Navigation />
                      <div className="flex items-center gap-4">
                        <ThemeSwitcher />
                        <LanguageSwitcher />
                      </div>
                    </div>
                  </div>
                </nav>
                <main>{children}</main>
              </div>
            </ReactQueryProvider>
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
