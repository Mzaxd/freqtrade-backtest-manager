'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart3, TrendingUp, Clock, CheckCircle } from 'lucide-react'
import { useTranslations } from 'next-intl'
 
async function getDashboardStats() {
  const [backtests, strategies, configs] = await Promise.all([
    fetch('/api/backtests').then(res => res.json()),
    fetch('/api/strategies').then(res => res.json()),
    fetch('/api/configs').then(res => res.json()),
  ])

  const runningTasks = backtests.filter((t: any) => t.status === 'RUNNING').length
  const completedTasks = backtests.filter((t: any) => t.status === 'COMPLETED').length
  const failedTasks = backtests.filter((t: any) => t.status === 'FAILED').length

  return {
    totalBacktests: backtests.length,
    runningTasks,
    completedTasks,
    failedTasks,
    totalStrategies: strategies.length,
    totalConfigs: configs.length,
    recentBacktests: backtests.slice(0, 5),
  }
}

export default function Dashboard() {
  const t = useTranslations('Dashboard');
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: getDashboardStats,
  })

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">{t('title')}</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <CardTitle className="h-4 bg-gray-200 rounded"></CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">{t('title')}</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('total_backtests')}</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalBacktests || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('running')}</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.runningTasks || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('completed')}</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.completedTasks || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('total_strategies')}</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalStrategies || 0}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('recent_backtests')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats?.recentBacktests?.map((backtest: any) => (
                <div key={backtest.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{backtest.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {backtest.strategy?.className} • {new Date(backtest.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className={`text-sm font-medium ${
                    backtest.status === 'COMPLETED' ? 'text-green-600' :
                    backtest.status === 'FAILED' ? 'text-red-600' :
                    backtest.status === 'RUNNING' ? 'text-blue-600' :
                    'text-gray-600'
                  }`}>
                    {backtest.status}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('quick_actions')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <a
                href="/backtests/new"
                className="block w-full px-4 py-2 bg-blue-600 text-white rounded-md text-center hover:bg-blue-700"
              >
                {t('new_backtest')}
              </a>
              <a
                href="/strategies"
                className="block w-full px-4 py-2 bg-gray-600 text-white rounded-md text-center hover:bg-gray-700"
              >
                {t('manage_strategies')}
              </a>
              <a
                href="/configs"
                className="block w-full px-4 py-2 bg-gray-600 text-white rounded-md text-center hover:bg-gray-700"
              >
                {t('manage_configs')}
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
