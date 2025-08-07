'use client';

import {useTranslations} from 'next-intl';
import {Link} from '@/navigation';

export function Navigation() {
  const t = useTranslations('Layout');

  return (
    <div className="flex items-center space-x-8">
      <h1 className="text-xl font-bold">Freqtrade 回测管理器</h1>
      <div className="flex space-x-4">
        <Link href="/dashboard" className="text-gray-600 hover:text-gray-900">
          {t('dashboard')}
        </Link>
        <Link href="/backtests" className="text-gray-600 hover:text-gray-900">
          {t('backtest_history')}
        </Link>
        <Link href="/strategies" className="text-gray-600 hover:text-gray-900">
          {t('strategy_management')}
        </Link>
        <Link href="/configs" className="text-gray-600 hover:text-gray-900">
          {t('config_management')}
        </Link>
        <Link href="/data" className="text-gray-600 hover:text-gray-900">
          {t('data_management')}
        </Link>
      </div>
    </div>
  );
}