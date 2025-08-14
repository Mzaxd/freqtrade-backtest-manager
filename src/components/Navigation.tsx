'use client';

import {useTranslations} from 'next-intl';
import {Link} from '@/navigation';

export function Navigation() {
  const t = useTranslations('Layout');

  return (
    <div className="flex items-center space-x-8">
      <h1 className="text-xl font-bold font-georgia">Freqtrade 回测管理器</h1>
      <div className="flex space-x-6">
        <Link href="/dashboard" className="text-gray-600 hover:text-black hover:bg-gray-100 px-3 py-2 rounded-md transition-all duration-200">
          {t('dashboard')}
        </Link>
        <Link href="/backtests" className="text-gray-600 hover:text-black hover:bg-gray-100 px-3 py-2 rounded-md transition-all duration-200">
          {t('backtest_history')}
        </Link>
        <Link href="/strategies" className="text-gray-600 hover:text-black hover:bg-gray-100 px-3 py-2 rounded-md transition-all duration-200">
          {t('strategy_management')}
        </Link>
        <Link href="/configs" className="text-gray-600 hover:text-black hover:bg-gray-100 px-3 py-2 rounded-md transition-all duration-200">
          {t('config_management')}
        </Link>
        <Link href="/data" className="text-gray-600 hover:text-black hover:bg-gray-100 px-3 py-2 rounded-md transition-all duration-200">
          {t('data_management')}
        </Link>
      </div>
    </div>
  );
}