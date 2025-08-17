'use client'

import { useQuery, useMutation } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Trash2, RefreshCw, BarChart3 } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'

// 定义类型
interface Strategy {
  id: number
  filename: string
  className: string
  description?: string
  createdAt: string
  updatedAt: string
}

interface Config {
  id: number
  name: string
  description?: string
  data: any
  createdAt: string
  updatedAt: string
}

interface GeneratedBacktest {
  id: string
  name: string
  status: string
  createdAt: string
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
  strategyId: number
  configId: number
  strategy?: Strategy
  config?: Config
  generatedBacktests?: GeneratedBacktest[]
}

async function getHyperopts() {
  console.log('[DEBUG] 开始获取 Hyperopt 数据...')
  const response = await fetch('/api/hyperopts')
  if (!response.ok) throw new Error('Failed to fetch hyperopts')
  const data = await response.json()
  console.log('[DEBUG] 获取到的 Hyperopt 数据:', data)
  return data
}

export default function HyperoptsPage() {
  const t = useTranslations('HyperoptHistory')
  const { data: hyperopts, isLoading } = useQuery({
    queryKey: ['hyperopts'],
    queryFn: getHyperopts,
  })

  const queryClient = useQueryClient()

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/hyperopts/${id}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        throw new Error('Failed to delete hyperopt')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hyperopts'] })
    },
  })

  const retryMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/hyperopts/${id}/retry`, {
        method: 'POST',
      })
      if (!response.ok) {
        throw new Error('Failed to retry hyperopt')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hyperopts'] })
    },
  })

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id)
    } catch (error) {
      console.error('Failed to delete hyperopt:', error)
    }
  }

  const handleRetry = async (id: string) => {
    try {
      await retryMutation.mutateAsync(id)
    } catch (error) {
      console.error('Failed to retry hyperopt:', error)
    }
  }

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

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">{t('title')}</h1>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">{t('title')}</h1>
        <Link href="/hyperopts/new">
          <Button>{t('newHyperopt')}</Button>
        </Link>
      </div>

      <div className="space-y-4">
        {hyperopts?.map((hyperopt: HyperoptTask) => (
          <Card key={hyperopt.id}>
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <h3 className="text-lg font-semibold">{hyperopt.strategy?.className} - {hyperopt.spaces} - {hyperopt.epochs} epochs</h3>
                    <Badge className={getStatusColor(hyperopt.status)}>
                      {hyperopt.status}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
                    <div>
                      <p><span className="font-medium">{t('strategy')}:</span> {hyperopt.strategy?.className}</p>
                      <p><span className="font-medium">{t('config')}:</span> {hyperopt.config?.name}</p>
                      <p><span className="font-medium">{t('epochs')}:</span> {hyperopt.epochs}</p>
                      <p><span className="font-medium">{t('spaces')}:</span> {hyperopt.spaces}</p>
                    </div>
                    <div>
                      <p><span className="font-medium">{t('lossFunction')}:</span> {hyperopt.lossFunction}</p>
                      <p><span className="font-medium">{t('duration')}:</span> {formatDuration(hyperopt.duration)}</p>
                      {hyperopt.timerange && (
                        <p><span className="font-medium">{t('timerange')}:</span> {hyperopt.timerange}</p>
                      )}
                      <p><span className="font-medium">{t('createdAt')}:</span> {format(new Date(hyperopt.createdAt), 'PPpp')}</p>
                      </div>
                  </div>

                  {hyperopt.generatedBacktests && hyperopt.generatedBacktests.length > 0 && (
                    <div className="mt-3">
                      <p className="text-sm font-medium text-muted-foreground mb-1">
                        {t('generatedBacktests')} ({hyperopt.generatedBacktests.length}):
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {hyperopt.generatedBacktests.slice(0, 3).map((backtest) => (
                          <Link key={backtest.id} href={`/backtests/${backtest.id}`}>
                            <Badge variant="outline" className="text-xs cursor-pointer hover:bg-gray-100">
                              {backtest.name}
                            </Badge>
                          </Link>
                        ))}
                        {hyperopt.generatedBacktests.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{hyperopt.generatedBacktests.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-2 ml-4">
                  <Link href={`/hyperopts/${hyperopt.id}`}>
                    <Button variant="outline" size="sm">{t('viewDetails')}</Button>
                  </Link>
                  
                  {hyperopt.status === 'COMPLETED' && hyperopt.bestResult && (
                    <Link href={`/hyperopts/${hyperopt.id}/results`}>
                      <Button variant="outline" size="sm">
                        <BarChart3 className="h-4 w-4 mr-1" />
                        {t('viewResults')}
                      </Button>
                    </Link>
                  )}
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRetry(hyperopt.id)}
                    disabled={retryMutation.isPending}
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{t('deleteDialog.title')}</AlertDialogTitle>
                        <AlertDialogDescription>
                          {t('deleteDialog.description')}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{t('deleteDialog.cancel')}</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(hyperopt.id)}
                        >
                          {t('deleteDialog.confirm')}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}