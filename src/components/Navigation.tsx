'use client';

import {useTranslations} from 'next-intl';
import {Link} from '@/navigation';
import {usePathname} from 'next/navigation';
import {Bot, Database, FileCode, History, LayoutDashboard, Loader2, Wrench} from 'lucide-react';
import {useState} from 'react';

export function Navigation() {
  const t = useTranslations('Layout');
  const pathname = usePathname();
  const [loadingLink, setLoadingLink] = useState<string | null>(null);

  const navItems = [
    { href: '/dashboard' as const, label: t('dashboard'), icon: <LayoutDashboard className="h-4 w-4" /> },
    { href: '/strategies' as const, label: t('strategy_management'), icon: <FileCode className="h-4 w-4" /> },
    { href: '/configs' as const, label: t('config_management'), icon: <Wrench className="h-4 w-4" /> },
    { href: '/data' as const, label: t('data_management'), icon: <Database className="h-4 w-4" /> },
    { href: '/backtests' as const, label: t('backtest_history'), icon: <History className="h-4 w-4" /> },
    { href: '/hyperopts' as const, label: t('hyperopt_history'), icon: <Bot className="h-4 w-4" /> },
  ];

  const isActive = (href: string) => {
    if (href === '/strategies') {
      return pathname.startsWith('/strategies');
    }
    return pathname === href;
  };

  return (
    <div className="flex items-center space-x-8">
      <h1 className="text-xl font-bold font-georgia">Freqtrade 回测管理器</h1>
      <div className="flex space-x-6">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`
              relative px-3 py-2 rounded-md transition-all duration-200 flex items-center space-x-2
              ${isActive(item.href) 
                ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 font-medium' 
                : 'text-gray-600 hover:text-black hover:bg-gray-100 dark:hover:bg-gray-700'
              }
              ${loadingLink === item.href ? 'animate-pulse' : ''}
            `}
            onClick={() => setLoadingLink(item.href)}
          >
            {item.icon}
            <span>{item.label}</span>
            {loadingLink === item.href && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 animate-pulse"></div>
              </div>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}