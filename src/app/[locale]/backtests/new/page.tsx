'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, AlertCircle, Zap, X } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface Strategy {
  id: string
  filename: string
  className: string
  description: string
}

interface Config {
  id: string
  name: string
  description: string
}

interface HyperoptResult {
  id: string
  bestResult: any
  strategyId: string
  configId: string
  strategy: {
    className: string
  }
  config: {
    name: string
  }
  epochs: number
  spaces: string
}

async function getStrategies() {
  try {
    console.log('[DEBUG] Fetching strategies...');
    const response = await fetch('/api/strategies');
    if (!response.ok) {
      const error = await response.json();
      console.error('[DEBUG] Failed to fetch strategies:', error);
      throw new Error(error.error || 'Failed to fetch strategies');
    }
    const data = await response.json();
    console.log('[DEBUG] Strategies fetched successfully:', data);
    return data.data || data || [];
  } catch (error) {
    console.error('[DEBUG] Error in getStrategies:', error);
    throw error;
  }
}

async function getConfigs() {
  const response = await fetch('/api/configs')
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to fetch configs')
  }
  const data = await response.json()
  return data.data || data || []
}

async function getHyperopt(id: string) {
  const response = await fetch(`/api/hyperopts/${id}`)
  if (!response.ok) {
    throw new Error('Failed to fetch hyperopt')
  }
  return response.json()
}

async function createBacktest(data: any) {
  const response = await fetch('/api/backtests', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to create backtest')
  }
  
  return response.json()
}

export default function NewBacktestPage() {
  const t = useTranslations('NewBacktest');
  const router = useRouter()
  const searchParams = useSearchParams()
  const hyperoptId = searchParams.get('hyperopt')
  const strategyIdFromQuery = searchParams.get('strategyId')
  
  const [formData, setFormData] = useState({
    name: '',
    strategyId: '',
    configId: '',
    timerangeStart: '',
    timerangeEnd: '',
    hyperoptParams: null as any,
  })
  const [error, setError] = useState<string | null>(null)
  const [hyperoptData, setHyperoptData] = useState<HyperoptResult | null>(null)

  const { data: strategies, isLoading: strategiesLoading, error: strategiesError } = useQuery<Strategy[], Error>({
    queryKey: ['strategies'],
    queryFn: getStrategies,
  });

  const { data: configs, isLoading: configsLoading, error: configsError } = useQuery<Config[]>({
    queryKey: ['configs'],
    queryFn: getConfigs,
  })

  const { data: hyperopt, isLoading: hyperoptLoading } = useQuery({
    queryKey: ['hyperopt', hyperoptId],
    queryFn: () => hyperoptId ? getHyperopt(hyperoptId) : Promise.resolve(null),
    enabled: !!hyperoptId,
  })

  // 处理 hyperopt 数据加载
  useEffect(() => {
    if (hyperopt) {
      setHyperoptData(hyperopt)
      setFormData(prev => ({
        ...prev,
        strategyId: hyperopt.strategyId,
        configId: hyperopt.configId,
        name: `${hyperopt.strategy.className} - Hyperopt Backtest`,
        hyperoptParams: hyperopt.bestResult?.params || null,
      }))
    }
  }, [hyperopt])

  useEffect(() => {
    if (strategyIdFromQuery) {
      setFormData(prev => ({
        ...prev,
        strategyId: strategyIdFromQuery,
      }))
    }
  }, [strategyIdFromQuery])

  const removeHyperoptParams = () => {
    setFormData(prev => ({
      ...prev,
      hyperoptParams: null,
    }))
    setHyperoptData(null)
    // Clear the hyperopt from URL
    const url = new URL(window.location.href)
    url.searchParams.delete('hyperopt')
    window.history.pushState({}, '', url.toString())
  }

  const mutation = useMutation({
    mutationFn: createBacktest,
    onSuccess: (data: { id: string }) => {
      router.push(`/backtests/${data.id}`)
    },
    onError: (error: Error) => {
      setError(error.message)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!formData.name.trim()) {
      setError(t('validation.nameRequired'))
      return
    }

    if (!formData.strategyId) {
      setError(t('validation.strategyRequired'))
      return
    }

    if (!formData.configId) {
      setError(t('validation.configRequired'))
      return
    }

    if (!formData.timerangeStart || !formData.timerangeEnd) {
      setError(t('validation.timeRangeRequired'))
      return
    }

    const start = new Date(formData.timerangeStart)
    const end = new Date(formData.timerangeEnd)

    if (start >= end) {
      setError(t('validation.timeRangeInvalid'))
      return
    }

    mutation.mutate({
      ...formData,
      strategyId: parseInt(formData.strategyId, 10),
      configId: parseInt(formData.configId, 10),
      timerangeStart: new Date(formData.timerangeStart).toISOString(),
      timerangeEnd: new Date(formData.timerangeEnd).toISOString(),
      hyperoptParams: formData.hyperoptParams,
    })
  }

  if (strategiesError || configsError) {
    return (
      <div className="container mx-auto p-6 max-w-2xl">
        <h1 className="text-3xl font-bold mb-6">{t('title')}</h1>
  
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
            <h3 className="text-lg font-medium text-red-800">{t('loadError.title')}</h3>
          </div>
          <p className="mt-2 text-sm text-red-700">
            {strategiesError ? `策略加载失败: ${strategiesError.message}` : ''}
            {configsError ? `配置加载失败: ${configsError.message}` : ''}
            {(!strategiesError && !configsError) ? t('loadError.message') : ''}
          </p>
        </div>
      </div>
    )
  }

  if (strategiesLoading || configsLoading || hyperoptLoading) {
    return (
      <div className="container mx-auto p-6 max-w-2xl">
        <h1 className="text-3xl font-bold mb-6">{t('title')}</h1>
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <h1 className="text-3xl font-bold mb-6">{t('title')}</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {hyperoptData && (
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-blue-800">
                <div className="flex items-center">
                  <Zap className="h-5 w-5 mr-2" />
                  Hyperopt 参数已应用
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={removeHyperoptParams}
                  className="text-blue-600 hover:text-blue-800"
                >
                  <X className="h-4 w-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <p><strong>来源:</strong> {hyperoptData.strategy.className} - {hyperoptData.spaces} - {hyperoptData.epochs} epochs</p>
                <p><strong>最佳损失值:</strong> {hyperoptData.bestResult?.loss || 'N/A'}</p>
                {formData.hyperoptParams && (
                  <div>
                    <p className="font-medium mb-2">优化参数:</p>
                    <div className="bg-white p-3 rounded border text-xs font-mono max-h-32 overflow-y-auto">
                      {JSON.stringify(formData.hyperoptParams, null, 2)}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>{t('basicInfo')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">{t('taskName')}</Label>
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={t('taskNamePlaceholder')}
              />
            </div>

            <div>
              <Label htmlFor="strategy">{t('strategy')}</Label>
              <Select
                value={formData.strategyId}
                onValueChange={(value) => setFormData({ ...formData, strategyId: value })}
                disabled={!!hyperoptId || !!strategyIdFromQuery}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('selectStrategy')} />
                </SelectTrigger>
                <SelectContent>
                  {(strategies || []).length > 0 ? (
                    (strategies || []).map((strategy: Strategy) => (
                      <SelectItem key={strategy.id} value={String(strategy.id)}>
                        {strategy.className}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem disabled value="">{t('noStrategiesAvailable')}</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="config">{t('config')}</Label>
              <Select value={formData.configId} onValueChange={(value) => setFormData({ ...formData, configId: value })}>
                <SelectTrigger>
                  <SelectValue placeholder={t('selectConfig')} />
                </SelectTrigger>
                <SelectContent>
                  {configs?.map((config: Config) => (
                    <SelectItem key={config.id} value={String(config.id)}>
                      {config.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start">{t('startTime')}</Label>
                <Input
                  id="start"
                  type="date"
                  value={formData.timerangeStart}
                  onChange={(e) => setFormData({ ...formData, timerangeStart: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="end">{t('endTime')}</Label>
                <Input
                  id="end"
                  type="date"
                  value={formData.timerangeEnd}
                  onChange={(e) => setFormData({ ...formData, timerangeEnd: e.target.value })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
              <h3 className="text-lg font-medium text-red-800">{t('error')}</h3>
            </div>
            <p className="mt-2 text-sm text-red-700">{error}</p>
          </div>
        )}

        <div className="flex justify-end space-x-4">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            {t('cancel')}
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('createBacktest')}
          </Button>
        </div>
      </form>
    </div>
  )
}
