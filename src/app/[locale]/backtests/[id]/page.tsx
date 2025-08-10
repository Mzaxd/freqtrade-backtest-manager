'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import RealtimeLogViewer from '@/components/RealtimeLogViewer'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { SummaryMetricsCard } from "@/components/SummaryMetricsCard"
import { RefreshCw, Image } from 'lucide-react'
import { useState } from 'react'

interface BacktestTask {
  id: string
  name: string
  status: string
  timerangeStart: string
  timerangeEnd: string
  createdAt: string
  completedAt: string | null
  resultsSummary: any
  plotProfitUrl?: string | null
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
  const queryClient = useQueryClient()
  const [isPlotting, setIsPlotting] = useState(false)

  const { data: backtest, isLoading, error } = useQuery({
    queryKey: ['backtest', id],
    queryFn: () => getBacktest(id),
    refetchInterval: (query: any) => {
      const data = query.state.data as BacktestTask | undefined
      if (data?.status === 'RUNNING' || data?.status === 'PENDING') {
        return 5000 // 5 seconds
      }
      return false // Stop refetching
    },
  })

  const retryMutation = useMutation({
    mutationFn: () => fetch(`/api/backtests/${id}/retry`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backtest', id] })
      queryClient.invalidateQueries({ queryKey: ['backtests'] })
    },
  })

  const plotMutation = useMutation({
    mutationFn: () => fetch(`/api/backtests/${id}/plot`, { method: 'POST' }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['backtest', id] })
    },
    onSettled: () => {
      setIsPlotting(false)
    }
  })

  const handleRetry = () => {
    retryMutation.mutate()
  }

  const handleGeneratePlot = () => {
    setIsPlotting(true)
    plotMutation.mutate()
  }

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

  const showLogs = ['RUNNING', 'PENDING'].includes(backtest.status) || !!backtest.logs

  return (
    <div className="container mx-auto p-6">
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
          <Button onClick={handleRetry} disabled={retryMutation.isPending} size="sm" variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            {retryMutation.isPending ? '正在重试...' : '重新回测'}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">概览</TabsTrigger>
          <TabsTrigger value="analysis">交易分析</TabsTrigger>
          <TabsTrigger value="logs">日志</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>基本信息</CardTitle>
              </CardHeader>
              <CardContent>
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
              </CardContent>
            </Card>

            {backtest.resultsSummary && (
              <Card>
                <CardHeader>
                  <CardTitle>回测结果</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">总交易数</p>
                      <p className="text-2xl font-bold">{backtest.resultsSummary.total_trades || 0}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">总收益</p>
                      <p className="text-2xl font-bold">{backtest.resultsSummary.profit_total || 0}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">收益率</p>
                      <p className="text-2xl font-bold">{backtest.resultsSummary.profit_total_abs || 0}%</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">胜率</p>
                      <p className="text-2xl font-bold">{backtest.resultsSummary.wins || 0} / {backtest.resultsSummary.total_trades || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {backtest.resultsSummary && (
              <SummaryMetricsCard results={backtest.resultsSummary} />
            )}
          </div>
        </TabsContent>

        <TabsContent value="analysis" className="mt-4">
          {backtest.plotProfitUrl ? (
            <Card>
              <CardHeader>
                <CardTitle>Profit Plot</CardTitle>
              </CardHeader>
              <CardContent>
                <iframe
                  src={backtest.plotProfitUrl}
                  className="w-full h-[800px] border-0"
                  title="Profit Plot"
                />
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>交易分析</CardTitle>
              </CardHeader>
              <CardContent>
                {backtest.status === 'COMPLETED' ? (
                  <div>
                    <p className="mb-4">回测已完成，但尚未生成交易分析图表。</p>
                    <Button onClick={handleGeneratePlot} disabled={isPlotting || plotMutation.isPending}>
                      <Image className="h-4 w-4 mr-2" />
                      {isPlotting || plotMutation.isPending ? '正在生成图表...' : '生成图表'}
                    </Button>
                    {plotMutation.isError && (
                       <div className="mt-4 text-red-500">
                         生成图表失败: {(plotMutation.error as Error)?.message}
                       </div>
                    )}
                  </div>
                ) : (
                  <p>回测成功后将在此处显示图表。</p>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="logs" className="mt-4">
          {showLogs ? (
            <Card>
              <CardHeader>
                <CardTitle>日志</CardTitle>
              </CardHeader>
              <CardContent>
                <RealtimeLogViewer
                  logSourceUrl={`/api/backtests/${id}/logs`}
                  initialLogs={backtest.logs}
                />
              </CardContent>
            </Card>
          ) : (
            <p>此回测任务没有可显示的日志。</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
