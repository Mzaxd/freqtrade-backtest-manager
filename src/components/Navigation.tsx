'use client';

import {useTranslations} from 'next-intl';
import {Link} from '@/navigation';
import {usePathname} from 'next/navigation';
import {Loader2} from 'lucide-react';
import {useState} from 'react';

export function Navigation() {
  const t = useTranslations('Layout');
  const pathname = usePathname();
  const [loadingLink, setLoadingLink] = useState<string | null>(null);

  const navItems = [
    { href: '/dashboard', label: t('dashboard') },
    { href: '/backtests', label: t('backtest_history') },
    { href: '/strategies', label: t('strategy_management') },
    { href: '/configs', label: t('config_management') },
    { href: '/data', label: t('data_management') },
  ];

  const isActive = (href: string) => {
    return pathname === href || pathname.startsWith(href + '/');
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
            `}
            onClick={() => setLoadingLink(item.href)}
          >
            {loadingLink === item.href ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : null}
            <span>{item.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}