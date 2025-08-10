'use client'

import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, AlertCircle } from 'lucide-react'
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

async function getStrategies() {
  const response = await fetch('/api/strategies')
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to fetch strategies')
  }
  const data = await response.json()
  return data.data || data || []
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
  const [formData, setFormData] = useState({
    name: '',
    strategyId: '',
    configId: '',
    timerangeStart: '',
    timerangeEnd: '',
  })
  const [error, setError] = useState<string | null>(null)

  const { data: strategies, isLoading: strategiesLoading, error: strategiesError } = useQuery<Strategy[]>({
    queryKey: ['strategies'],
    queryFn: getStrategies,
  })

  const { data: configs, isLoading: configsLoading, error: configsError } = useQuery<Config[]>({
    queryKey: ['configs'],
    queryFn: getConfigs,
  })

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
      timerangeStart: new Date(formData.timerangeStart).toISOString(),
      timerangeEnd: new Date(formData.timerangeEnd).toISOString(),
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
            {(strategiesError || configsError)?.message || t('loadError.message')}
          </p>
        </div>
      </div>
    )
  }

  if (strategiesLoading || configsLoading) {
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
              <Select value={formData.strategyId} onValueChange={(value) => setFormData({ ...formData, strategyId: value })}>
                <SelectTrigger>
                  <SelectValue placeholder={t('selectStrategy')} />
                </SelectTrigger>
                <SelectContent>
                  {strategies?.map((strategy: Strategy) => (
                    <SelectItem key={strategy.id} value={String(strategy.id)}>
                      {strategy.className}
                    </SelectItem>
                  ))}
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
