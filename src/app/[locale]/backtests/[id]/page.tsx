'use client'

import { useMutation, useQuery, useQueryClient, Query } from '@tanstack/react-query'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import RealtimeLogViewer from '@/components/RealtimeLogViewer'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { SummaryMetricsCard } from "@/components/SummaryMetricsCard"
import { RefreshCw, Image, ArrowLeft, CheckCircle2, XCircle, Loader2, Hourglass } from 'lucide-react'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { format } from 'date-fns'
import { TradesTable } from "@/components/TradesTable";
import { EnhancedTradingChart } from "@/components/EnhancedTradingChart";
import { FullBacktestResult } from "@/components/SummaryMetricsCard";
import { TradeData } from '@/types/chart';

async function getBacktest(id: string, page: number, limit: number, sortBy: string, sortOrder: string, filters: Record<string, any>): Promise<FullBacktestResult> {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    sortBy,
    sortOrder,
    ...filters,
  });
  const response = await fetch(`/api/backtests/${id}?${params.toString()}`, { cache: 'no-store' })
  if (!response.ok) {
    throw new Error('Failed to fetch backtest')
  }
  const data = await response.json();
  // Dates are serialized as strings, so we need to convert them back
  return {
    ...data,
    createdAt: new Date(data.createdAt),
    completedAt: data.completedAt ? new Date(data.completedAt) : null,
    timerangeStart: data.timerangeStart ? new Date(data.timerangeStart) : null,
    timerangeEnd: data.timerangeEnd ? new Date(data.timerangeEnd) : null,
    trades: data.trades.map((t: any) => ({
      ...t,
      open_date: new Date(t.open_date),
      close_date: new Date(t.close_date),
      open_timestamp: new Date(t.open_date).getTime(),
      close_timestamp: new Date(t.close_date).getTime(),
    }))
  };
}

export default function BacktestDetailPage() {
  const t = useTranslations('BacktestDetail');
  const params = useParams()
  const id = params.id as string
  const queryClient = useQueryClient()
  const [isPlotting, setIsPlotting] = useState(false)
  const [activeTab, setActiveTab] = useState("overview");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [sortBy, setSortBy] = useState('open_date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [filters, setFilters] = useState({});
  const [clearLogCache, setClearLogCache] = useState(false);
  const [showEnhancedChart, setShowEnhancedChart] = useState(false);

  const { data: backtest, isLoading, error } = useQuery<FullBacktestResult, Error>({
    queryKey: ['backtest', id, page, limit, sortBy, sortOrder, filters],
    queryFn: () => getBacktest(id, page, limit, sortBy, sortOrder, filters),
    refetchInterval: (query) => {
      const data = query.state.data
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
      setClearLogCache(true);
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
          <h3 className="text-lg font-medium text-red-800">{t('loadError.title')}</h3>
          <p className="mt-2 text-sm text-red-700">{(error as Error)?.message}</p>
        </div>
      </div>
    )
  }

  if (!backtest) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">{t('notFound')}</h2>
        </div>
      </div>
    )
  }

  const showLogs = ['RUNNING', 'PENDING'].includes(backtest.status) || !!backtest.logs

  return (
    <div className="container mx-auto p-6 relative">
      {backtest.strategy.id && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Link href={`/strategies/${backtest.strategy.id}`} className="absolute top-4 right-4">
                <Button size="icon" variant="outline">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
            </TooltipTrigger>
            <TooltipContent>
              <p>{t('backToStrategy')}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">{backtest.name}</h1>
        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            {
              {
                COMPLETED: <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-green-100 text-green-800"><CheckCircle2 className="h-4 w-4 mr-1" />COMPLETED</span>,
                FAILED: <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-red-100 text-red-800"><XCircle className="h-4 w-4 mr-1" />FAILED</span>,
                RUNNING: <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-blue-100 text-blue-800"><Loader2 className="h-4 w-4 mr-1 animate-spin" />RUNNING</span>,
                PENDING: <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800"><Hourglass className="h-4 w-4 mr-1" />PENDING</span>
              }[backtest.status] || <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-gray-100 text-gray-800">{backtest.status}</span>
            }
          </div>
          <span className="text-sm text-gray-600">
            {t('createdAt')}: {format(backtest.createdAt, 'PPpp')}
          </span>
          <Button onClick={handleRetry} disabled={retryMutation.isPending} size="sm" variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            {retryMutation.isPending ? t('retrying') : t('retry')}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="justify-start">
          <TabsTrigger value="overview">{t('tabs.overview')}</TabsTrigger>
          <TabsTrigger value="analysis">{t('tabs.analysis')}</TabsTrigger>
          <TabsTrigger value="chart">K线图</TabsTrigger>
          <TabsTrigger value="logs">{t('tabs.logs')}</TabsTrigger>
          <TabsTrigger value="trades">{t('tabs.trades')}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('basicInfo.title')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">{t('basicInfo.strategy')}</p>
                    <p className="font-medium">{backtest.strategy.className}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">{t('basicInfo.config')}</p>
                    <p className="font-medium">{backtest.config?.name || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">{t('basicInfo.startTime')}</p>
                    <p className="font-medium">{backtest.timerangeStart ? format(backtest.timerangeStart, 'PP') : 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">{t('basicInfo.endTime')}</p>
                    <p className="font-medium">{backtest.timerangeEnd ? format(backtest.timerangeEnd, 'PP') : 'N/A'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {backtest.resultsSummary ? <SummaryMetricsCard results={backtest} /> : <p>无总结性指标数据。</p>}
          </div>
        </TabsContent>

        <TabsContent value="analysis" className="mt-4">
          {backtest.plotProfitUrl ? (
            <Card>
              <CardHeader>
                <CardTitle>{t('analysis.profitPlotTitle')}</CardTitle>
              </CardHeader>
              <CardContent>
                <iframe
                  src={backtest.plotProfitUrl}
                  className="w-full h-[800px] border-0"
                  title={t('analysis.profitPlotTitle')}
                />
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>{t('analysis.title')}</CardTitle>
              </CardHeader>
              <CardContent>
                {backtest.status === 'COMPLETED' ? (
                  <div>
                    <p className="mb-4">{t('analysis.noChart')}</p>
                    <Button onClick={handleGeneratePlot} disabled={isPlotting || plotMutation.isPending}>
                      <Image className="h-4 w-4 mr-2" />
                      {isPlotting || plotMutation.isPending ? t('analysis.generating') : t('analysis.generate')}
                    </Button>
                    {plotMutation.isError && (
                       <div className="mt-4 text-red-500">
                         {t('analysis.generateFailed')}: {(plotMutation.error as Error)?.message}
                       </div>
                    )}
                  </div>
                ) : (
                  <p>{t('analysis.pending')}</p>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="chart" className="mt-4">
          <EnhancedTradingChart
            backtestId={id}
            initialData={backtest ? {
              candles: [], // 将在组件内部加载
              trades: backtest.trades.map(t => ({...t, open_date: t.open_date.toISOString(), close_date: t.close_date.toISOString(), open_timestamp: t.open_date.getTime(), close_timestamp: t.close_date.getTime()})) as TradeData[] || []
            } : undefined}
            className="w-full"
          />
        </TabsContent>

        <TabsContent value="trades" className="mt-4">
          <TradesTable
            trades={backtest.trades.map(t => ({...t, open_date: t.open_date.toISOString(), close_date: t.close_date.toISOString()}))}
            tradesCount={backtest.tradesCount || 0}
            page={page}
            limit={limit}
            onPageChange={setPage}
            onLimitChange={setLimit}
            onSortChange={(newSortBy, newSortOrder) => {
              setSortBy(newSortBy);
              setSortOrder(newSortOrder);
            }}
            onFilterChange={setFilters}
            exitReasons={backtest.exitReasons || []}
          />
        </TabsContent>

        <TabsContent value="logs" className="mt-4">
          {showLogs ? (
            <Card>
              <CardHeader>
                <CardTitle>{t('logs.title')}</CardTitle>
              </CardHeader>
              <CardContent className="h-[75vh] overflow-y-auto">
                <RealtimeLogViewer
                  logSourceUrl={`/api/backtests/${id}/logs/stream`}
                  initialLogs={backtest.logs || ''}
                  clearCache={clearLogCache}
                />
              </CardContent>
            </Card>
          ) : (
            <p>{t('logs.noLogs')}</p>
          )}
        </TabsContent>
      </Tabs>

    </div>
  )
}
