import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ReactQueryProvider } from '@/components/providers/react-query-provider'
import { Toaster } from 'react-hot-toast'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Freqtrade 回测管理器',
  description: 'Freqtrade 可视化回测平台',
}

export default function RootLayout({
  children,
  params: {locale}
}: {
  children: React.ReactNode;
  params: {locale: string};
}) {
  return (
    <html lang={locale}>
      <body className={inter.className}>
        <ReactQueryProvider>
          <Toaster position="top-center" reverseOrder={false} />
          <div className="min-h-screen bg-gray-50">
            <nav className="bg-white shadow-sm border-b">
              <div className="container mx-auto px-4 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-8">
                    <h1 className="text-xl font-bold">Freqtrade 回测管理器</h1>
                    <div className="flex space-x-4">
                      <a href="/dashboard" className="text-gray-600 hover:text-gray-900">
                        仪表盘
                      </a>
                      <a href="/backtests" className="text-gray-600 hover:text-gray-900">
                        回测历史
                      </a>
                      <a href="/strategies" className="text-gray-600 hover:text-gray-900">
                        策略管理
                      </a>
                      <a href="/configs" className="text-gray-600 hover:text-gray-900">
                        配置管理
                      </a>
                    </div>
                  </div>
                  <LanguageSwitcher />
                </div>
              </div>
            </nav>
            <main>{children}</main>
          </div>
        </ReactQueryProvider>
      </body>
    </html>
  )
}
