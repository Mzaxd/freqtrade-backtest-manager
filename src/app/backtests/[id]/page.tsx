'use client'

import { useQuery } from '@tanstack/react-query'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { useEffect, useState } from 'react'

interface Backtest {
  id: string
  name: string
  status: string
  createdAt: string
  completedAt?: string
  strategy: {
    className: string
  }
  config: {
    filename: string
  }
  resultsSummary?: {
    totalTrades: number
    totalProfit: number
    winRate: number
    sharpeRatio: number
    maxDrawdown: number
  }
}

async function getBacktest(id: string): Promise<Backtest> {
  const response = await fetch(`/api/backtests/${id}`)
  if (!response.ok) throw new Error('Failed to fetch backtest')
  return response.json()
}

export default function BacktestDetailPage() {
  const params = useParams()
  const id = params.id as string
  
  const [logs, setLogs] = useState<string[]>([])
  const [isConnected, setIsConnected] = useState(false)

  const { data: backtest } = useQuery<Backtest>({
    queryKey: ['backtest', id],
    queryFn: () => getBacktest(id),
    refetchInterval: (data) => {
      return data?.status === 'RUNNING' ? 2000 : false
    },
  })

  useEffect(() => {
    if (backtest?.status === 'RUNNING' && !isConnected) {
      const eventSource = new EventSource(`/api/backtests/${id}/logs`)
      
      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data)
        setLogs(prev => [...prev, data.log])
      }

      eventSource.onopen = () => {
        setIsConnected(true)
      }

      eventSource.onerror = () => {
        eventSource.close()
        setIsConnected(false)
      }

      return () => {
        eventSource.close()
        setIsConnected(false)
      }
    }
  }, [backtest?.status, id, isConnected])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800'
      case 'FAILED':
        return 'bg-red-100 text-red-800'
      case 'RUNNING':
        return 'bg-blue-100 text-blue-800'
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (!backtest) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold">加载中...</h1>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">{backtest.name}</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>基本信息</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">状态</span>
                <Badge className={getStatusColor(backtest.status)}>
                  {backtest.status}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">策略</span>
                <span>{backtest.strategy?.className}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">配置</span>
                <span>{backtest.config?.filename}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">创建时间</span>
                <span>{format(new Date(backtest.createdAt), 'PPpp', { locale: zhCN })}</span>
              </div>
              {backtest.completedAt && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">完成时间</span>
                  <span>{format(new Date(backtest.completedAt), 'PPpp', { locale: zhCN })}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {backtest.resultsSummary && (
          <Card>
            <CardHeader>
              <CardTitle>回测结果</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">总交易数</span>
                  <span>{backtest.resultsSummary.totalTrades}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">总收益</span>
                  <span className={backtest.resultsSummary.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {backtest.resultsSummary.totalProfit.toFixed(2)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">胜率</span>
                  <span>{(backtest.resultsSummary.winRate * 100).toFixed(2)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">夏普比率</span>
                  <span>{backtest.resultsSummary.sharpeRatio.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">最大回撤</span>
                  <span className="text-red-600">
                    {(backtest.resultsSummary.maxDrawdown * 100).toFixed(2)}%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>运行日志</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm max-h-96 overflow-y-auto">
            {logs.length === 0 ? (
              <div className="text-gray-500">
                {backtest.status === 'RUNNING' ? '等待日志...' : '暂无日志'}
              </div>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="whitespace-pre-wrap">
                  {log}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
