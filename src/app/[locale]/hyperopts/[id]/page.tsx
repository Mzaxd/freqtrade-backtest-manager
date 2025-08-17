'use client'

import { useMutation, useQuery, useQueryClient, Query } from '@tanstack/react-query'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import RealtimeLogViewer from '@/components/RealtimeLogViewer'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { RefreshCw, BarChart3, Play, Download } from 'lucide-react'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { format } from 'date-fns'
import Link from 'next/link'

function formatDuration(seconds?: number): string {
  if (!seconds) return 'N/A'
  
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainingSeconds = Math.floor(seconds % 60)
  
  if (hours > 0) {
    return `${hours}h ${minutes}m ${remainingSeconds}s`
  } else if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`
  } else {
    return `${remainingSeconds}s`
  }
}

interface HyperoptTask {
  id: string
  status: string
  epochs: number
  spaces: string
  lossFunction: string
  timerange?: string
  createdAt: string
  duration?: number
  bestResult?: any
  resultsPath?: string
  logPath?: string
  logs?: string
  strategy: {
    id: number
    className: string
    filename: string
  }
  config: {
    id: number
    name: string
  }
  generatedBacktests: Array<{
    id: string
    name: string
    status: string
    createdAt: string
  }>
}

async function getHyperopt(id: string) {
  const response = await fetch(`/api/hyperopts/${id}`)
  if (!response.ok) {
    throw new Error('Failed to fetch hyperopt')
  }
  return response.json()
}

export default function HyperoptDetailPage() {
  const t = useTranslations('HyperoptDetail')
  const params = useParams()
  const id = params.id as string
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState("overview")
  const [clearLogCache, setClearLogCache] = useState(false)

  const { data: hyperopt, isLoading, error } = useQuery({
    queryKey: ['hyperopt', id],
    queryFn: () => getHyperopt(id),
    refetchInterval: (query: Query) => {
      const data = query.state.data as HyperoptTask | undefined
      if (data?.status === 'RUNNING' || data?.status === 'PENDING') {
        return 5000 // 5 seconds
      }
      return false // Stop refetching
    },
  })

  const retryMutation = useMutation({
    mutationFn: () => fetch(`/api/hyperopts/${id}/retry`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hyperopt', id] })
      queryClient.invalidateQueries({ queryKey: ['hyperopts'] })
      setClearLogCache(true)
    },
  })

  const applyMutation = useMutation({
    mutationFn: () => fetch(`/api/hyperopts/${id}/apply`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hyperopt', id] })
    },
  })

  const handleRetry = () => {
    retryMutation.mutate()
  }

  const handleApplyToStrategy = () => {
    applyMutation.mutate()
  }

  const handleDownloadResults = () => {
    window.location.href = `/api/hyperopts/${id}/results/download`;
  };

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

  if (!hyperopt) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">{t('notFound')}</h2>
        </div>
      </div>
    )
  }

  const typedHyperopt = hyperopt as HyperoptTask
  const displayName = `${typedHyperopt.strategy.className} - ${typedHyperopt.spaces} - ${typedHyperopt.epochs} epochs`
  const showLogs = ['RUNNING', 'PENDING'].includes(typedHyperopt.status) || !!typedHyperopt.logs

  const getStatusColor = (status: string): string => {
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

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold mb-2">{displayName}</h1>
            <div className="flex items-center space-x-4">
              <Badge className={getStatusColor(typedHyperopt.status)}>
                {typedHyperopt.status}
              </Badge>
              <span className="text-sm text-gray-600">
                {t('createdAt')}: {format(new Date(typedHyperopt.createdAt), 'PPpp')}
              </span>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button onClick={handleRetry} disabled={retryMutation.isPending} size="sm" variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              {retryMutation.isPending ? t('retrying') : t('retry')}
            </Button>
            
            {typedHyperopt.status === 'COMPLETED' && typedHyperopt.bestResult && (
              <>
                <Link href={`/hyperopts/${id}/results`}>
                  <Button variant="outline" size="sm">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    {t('viewResults')}
                  </Button>
                </Link>
                
                <Button 
                  onClick={handleApplyToStrategy} 
                  disabled={applyMutation.isPending} 
                  size="sm"
                >
                  <Play className="h-4 w-4 mr-2" />
                  {applyMutation.isPending ? t('applying') : t('applyToStrategy')}
                </Button>
                
                <Link href={`/backtests/new?hyperopt=${id}`}>
                  <Button size="sm">
                    <Play className="h-4 w-4 mr-2" />
                    {t('backtestWithParams')}
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="justify-start">
          <TabsTrigger value="overview">{t('tabs.overview')}</TabsTrigger>
          <TabsTrigger value="results">{t('tabs.results')}</TabsTrigger>
          <TabsTrigger value="logs">{t('tabs.logs')}</TabsTrigger>
          <TabsTrigger value="backtests">{t('tabs.backtests')}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('basicInfo.title')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">{t('basicInfo.strategy')}</p>
                    <p className="font-medium">{typedHyperopt.strategy.className}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">{t('basicInfo.config')}</p>
                    <p className="font-medium">{typedHyperopt.config.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">{t('basicInfo.epochs')}</p>
                    <p className="font-medium">{typedHyperopt.epochs}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">{t('basicInfo.spaces')}</p>
                    <p className="font-medium">{typedHyperopt.spaces}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">{t('basicInfo.lossFunction')}</p>
                    <p className="font-medium">{typedHyperopt.lossFunction}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">{t('basicInfo.duration')}</p>
                    <p className="font-medium">{formatDuration(typedHyperopt.duration)}</p>
                  </div>
                  {typedHyperopt.timerange && (
                    <div>
                      <p className="text-sm text-gray-600">{t('basicInfo.timerange')}</p>
                      <p className="font-medium">{typedHyperopt.timerange}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {typedHyperopt.bestResult && (
              <Card>
                <CardHeader>
                  <CardTitle>{t('bestResult.title')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">{t('bestResult.loss')}</p>
                      <p className="text-2xl font-bold">{typedHyperopt.bestResult.loss?.toFixed(6) || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">{t('bestResult.epoch')}</p>
                      <p className="text-2xl font-bold">{typedHyperopt.bestResult.epoch || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">{t('bestResult.trades')}</p>
                      <p className="text-2xl font-bold">{typedHyperopt.bestResult.trades || 'N/A'}</p>
                    </div>
                  </div>
                  
                  {typedHyperopt.bestResult.params && (
                    <div className="mt-4">
                      <p className="text-sm text-gray-600 mb-2">{t('bestResult.parameters')}:</p>
                      <div className="bg-gray-50 p-3 rounded-lg text-sm font-mono">
                        {JSON.stringify(typedHyperopt.bestResult.params, null, 2)}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="results" className="mt-4">
          {typedHyperopt.status === 'COMPLETED' && typedHyperopt.resultsPath ? (
            <Card>
              <CardHeader>
                <CardTitle>{t('results.title')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p>{t('results.description')}</p>
                  
                  <div className="flex items-center space-x-4">
                    <Link href={`/hyperopts/${id}/results`}>
                      <Button>
                        <BarChart3 className="h-4 w-4 mr-2" />
                        {t('results.viewDetailed')}
                      </Button>
                    </Link>
                    
                    <Button variant="outline" onClick={handleDownloadResults}>
                      <Download className="h-4 w-4 mr-2" />
                      {t('results.download')}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>{t('results.title')}</CardTitle>
              </CardHeader>
              <CardContent>
                {typedHyperopt.status === 'COMPLETED' ? (
                  <p>{t('results.noResults')}</p>
                ) : (
                  <p>{t('results.pending')}</p>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="backtests" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('backtests.title')}</CardTitle>
            </CardHeader>
            <CardContent>
              {typedHyperopt.generatedBacktests && typedHyperopt.generatedBacktests.length > 0 ? (
                <div className="space-y-3">
                  {typedHyperopt.generatedBacktests.map((backtest) => (
                    <div key={backtest.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{backtest.name}</p>
                        <p className="text-sm text-gray-600">
                          {t('backtests.createdAt')}: {format(new Date(backtest.createdAt), 'PPp')}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className={getStatusColor(backtest.status)}>
                          {backtest.status}
                        </Badge>
                        <Link href={`/backtests/${backtest.id}`}>
                          <Button variant="outline" size="sm">
                            {t('backtests.viewDetails')}
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-600 mb-4">{t('backtests.noBacktests')}</p>
                  {typedHyperopt.status === 'COMPLETED' && typedHyperopt.bestResult && (
                    <Link href={`/backtests/new?hyperoptId=${id}`}>
                      <Button>
                        <Play className="h-4 w-4 mr-2" />
                        {t('backtests.createBacktest')}
                      </Button>
                    </Link>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="mt-4">
          {showLogs ? (
            <Card>
              <CardHeader>
                <CardTitle>{t('logs.title')}</CardTitle>
              </CardHeader>
              <CardContent className="h-[75vh] overflow-y-auto">
                <RealtimeLogViewer
                  logSourceUrl={`/api/hyperopts/${id}/logs/stream`}
                  initialLogs={typedHyperopt.logs || ''}
                  clearCache={clearLogCache}
                />
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>{t('logs.title')}</CardTitle>
              </CardHeader>
              <CardContent>
                <p>{t('logs.noLogs')}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}