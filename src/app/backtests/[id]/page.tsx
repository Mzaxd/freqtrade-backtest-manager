'use client'

import { useQuery } from '@tanstack/react-query'
import { useParams } from 'next/navigation'

interface BacktestTask {
  id: string
  name: string
  status: string
  timerangeStart: string
  timerangeEnd: string
  createdAt: string
  completedAt: string | null
  resultsSummary: any
  logs: string
  strategy: {
    className: string
  }
  config: {
    name: string
  }
}

async function getBacktest(id: string) {
  const response = await fetch(`/api/backtests/${id}`)
  if (!response.ok) {
    throw new Error('Failed to fetch backtest')
  }
  return response.json()
}

export default function BacktestDetailPage() {
  const params = useParams()
  const id = params.id as string

  const { data: backtest, isLoading, error } = useQuery({
    queryKey: ['backtest', id],
    queryFn: () => getBacktest(id),
  })

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-lg font-medium text-red-800">加载失败</h3>
          <p className="mt-2 text-sm text-red-700">{(error as Error)?.message}</p>
        </div>
      </div>
    )
  }

  if (!backtest) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">回测任务未找到</h2>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">{backtest.name}</h1>
        <div className="flex items-center space-x-4">
          <span className={`px-2 py-1 rounded text-sm ${
            backtest.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
            backtest.status === 'FAILED' ? 'bg-red-100 text-red-800' :
            backtest.status === 'RUNNING' ? 'bg-blue-100 text-blue-800' :
            'bg-yellow-100 text-yellow-800'
          }`}>
            {backtest.status}
          </span>
          <span className="text-sm text-gray-600">
            创建时间: {new Date(backtest.createdAt).toLocaleString('zh-CN')}
          </span>
        </div>
      </div>

      <div className="grid gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">基本信息</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">策略</p>
              <p className="font-medium">{backtest.strategy.className}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">配置</p>
              <p className="font-medium">{backtest.config.name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">开始时间</p>
              <p className="font-medium">{new Date(backtest.timerangeStart).toLocaleDateString('zh-CN')}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">结束时间</p>
              <p className="font-medium">{new Date(backtest.timerangeEnd).toLocaleDateString('zh-CN')}</p>
            </div>
          </div>
        </div>

        {backtest.status === 'FAILED' && backtest.logs && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">错误日志</h2>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto max-h-96 whitespace-pre-wrap break-all">
              {backtest.logs}
            </pre>
          </div>
        )}

        {backtest.resultsSummary && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">回测结果</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">总交易数</p>
                <p className="text-2xl font-bold">{backtest.resultsSummary.totalTrades || 0}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">总收益</p>
                <p className="text-2xl font-bold">{backtest.resultsSummary.totalProfit || 0}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">收益率</p>
                <p className="text-2xl font-bold">{backtest.resultsSummary.profitPercent || 0}%</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">胜率</p>
                <p className="text-2xl font-bold">{backtest.resultsSummary.winRate || 0}%</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
