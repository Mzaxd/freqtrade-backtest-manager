'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart3, TrendingUp, Clock, CheckCircle, Target, Zap } from 'lucide-react'
import { useTranslations } from 'next-intl'
 
async function getDashboardStats() {
  const [backtests, strategies, configs, hyperopts] = await Promise.all([
    fetch('/api/backtests').then(res => res.json()),
    fetch('/api/strategies').then(res => res.json()),
    fetch('/api/configs').then(res => res.json()),
    fetch('/api/hyperopts').then(res => res.json()),
  ])

  const runningBacktests = backtests.filter((t: any) => t.status === 'RUNNING').length
  const completedBacktests = backtests.filter((t: any) => t.status === 'COMPLETED').length
  const failedBacktests = backtests.filter((t: any) => t.status === 'FAILED').length

  const runningHyperopts = hyperopts.filter((t: any) => t.status === 'RUNNING').length
  const completedHyperopts = hyperopts.filter((t: any) => t.status === 'COMPLETED').length
  const failedHyperopts = hyperopts.filter((t: any) => t.status === 'FAILED').length

  return {
    totalBacktests: backtests.length,
    runningBacktests,
    completedBacktests,
    failedBacktests,
    totalHyperopts: hyperopts.length,
    runningHyperopts,
    completedHyperopts,
    failedHyperopts,
    totalStrategies: strategies.length,
    totalConfigs: configs.length,
    recentBacktests: backtests.slice(0, 5),
    recentHyperopts: hyperopts.slice(0, 5),
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
            <CardTitle className="text-sm font-medium">{t('total_hyperopts')}</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalHyperopts || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('running_tasks')}</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(stats?.runningBacktests || 0) + (stats?.runningHyperopts || 0)}</div>
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('backtest_stats')}</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-green-600">{t('completed')}:</span>
                <span>{stats?.completedBacktests || 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-blue-600">{t('running')}:</span>
                <span>{stats?.runningBacktests || 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-red-600">{t('failed')}:</span>
                <span>{stats?.failedBacktests || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('hyperopt_stats')}</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-green-600">{t('completed')}:</span>
                <span>{stats?.completedHyperopts || 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-blue-600">{t('running')}:</span>
                <span>{stats?.runningHyperopts || 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-red-600">{t('failed')}:</span>
                <span>{stats?.failedHyperopts || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('success_rate')}</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.totalBacktests && stats?.totalBacktests > 0 
                ? Math.round((stats?.completedBacktests || 0) / stats?.totalBacktests * 100) 
                : 0}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('total_configs')}</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalConfigs || 0}</div>
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
            <CardTitle>{t('recent_hyperopts')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats?.recentHyperopts?.map((hyperopt: any) => (
                <div key={hyperopt.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{hyperopt.epochs} epochs</p>
                    <p className="text-xs text-muted-foreground">
                      {hyperopt.strategy?.className} • {new Date(hyperopt.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className={`text-sm font-medium ${
                    hyperopt.status === 'COMPLETED' ? 'text-green-600' :
                    hyperopt.status === 'FAILED' ? 'text-red-600' :
                    hyperopt.status === 'RUNNING' ? 'text-blue-600' :
                    'text-gray-600'
                  }`}>
                    {hyperopt.status}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('quick_actions')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <a
                href="/backtests/new"
                className="block w-full px-4 py-2 bg-white text-black border border-gray-200 rounded-md text-center hover:bg-gray-50 shadow-sm hover:shadow-md transition-all duration-200"
              >
                {t('new_backtest')}
              </a>
              <a
                href="/hyperopts/new"
                className="block w-full px-4 py-2 bg-white text-black border border-gray-200 rounded-md text-center hover:bg-gray-50 shadow-sm hover:shadow-md transition-all duration-200"
              >
                {t('new_hyperopt')}
              </a>
              <a
                href="/strategies"
                className="block w-full px-4 py-2 bg-gray-100 text-black border border-gray-200 rounded-md text-center hover:bg-gray-200 shadow-sm hover:shadow-md transition-all duration-200"
              >
                {t('manage_strategies')}
              </a>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('system_info')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{t('total_tasks')}:</span>
                <span>{(stats?.totalBacktests || 0) + (stats?.totalHyperopts || 0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>{t('active_tasks')}:</span>
                <span>{(stats?.runningBacktests || 0) + (stats?.runningHyperopts || 0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>{t('completed_tasks')}:</span>
                <span>{(stats?.completedBacktests || 0) + (stats?.completedHyperopts || 0)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
