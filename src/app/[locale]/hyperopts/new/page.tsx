'use client'

import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, AlertCircle, Info } from 'lucide-react'
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

async function createHyperopt(data: any) {
  const response = await fetch('/api/hyperopts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to create hyperopt')
  }
  
  return response.json()
}

const SPACES_OPTIONS = [
  { value: 'buy', label: 'Buy Signals' },
  { value: 'sell', label: 'Sell Signals' },
  { value: 'roi', label: 'ROI' },
  { value: 'stoploss', label: 'Stop Loss' },
  { value: 'trailing', label: 'Trailing Stop' },
  { value: 'protection', label: 'Protection' },
  { value: 'all', label: 'All Spaces' }
]

const LOSS_FUNCTIONS = [
  { value: 'ShortTradeDurHyperOptLoss', label: 'Short Trade Duration' },
  { value: 'SortinoHyperOptLoss', label: 'Sortino Ratio' },
  { value: 'SortinoHyperOptLossDaily', label: 'Sortino Ratio (Daily)' },
  { value: 'SharpeHyperOptLoss', label: 'Sharpe Ratio' },
  { value: 'SharpeHyperOptLossDaily', label: 'Sharpe Ratio (Daily)' },
  { value: 'ProfitFactorHyperOptLoss', label: 'Profit Factor' },
  { value: 'CalmarHyperOptLoss', label: 'Calmar Ratio' },
  { value: 'MaxDrawDownHyperOptLoss', label: 'Max Drawdown' },
  { value: 'OnlyProfitHyperOptLoss', label: 'Only Profit' },
  { value: 'WinRateHyperOptLoss', label: 'Win Rate' }
]

export default function NewHyperoptPage() {
  const t = useTranslations('NewHyperopt')
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: '',
    strategyId: '',
    configId: '',
    epochs: '100',
    spaces: 'all',
    lossFunction: 'SharpeHyperOptLoss',
    timerange: '',
    jobWorkers: '',
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
    mutationFn: createHyperopt,
    onSuccess: (data: { id: string }) => {
      router.push(`/hyperopts/${data.id}`)
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

    if (!formData.epochs || parseInt(formData.epochs) < 1) {
      setError(t('validation.epochsRequired'))
      return
    }

    mutation.mutate({
      ...formData,
      epochs: parseInt(formData.epochs),
      jobWorkers: formData.jobWorkers ? parseInt(formData.jobWorkers) : undefined,
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('hyperoptSettings')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="epochs">{t('epochs')}</Label>
              <Input
                id="epochs"
                type="number"
                min="1"
                max="10000"
                value={formData.epochs}
                onChange={(e) => setFormData({ ...formData, epochs: e.target.value })}
                placeholder="100"
              />
              <p className="text-sm text-muted-foreground mt-1">
                {t('epochsDescription')}
              </p>
            </div>

            <div>
              <Label htmlFor="spaces">{t('spaces')}</Label>
              <Select value={formData.spaces} onValueChange={(value) => setFormData({ ...formData, spaces: value })}>
                <SelectTrigger>
                  <SelectValue placeholder={t('selectSpaces')} />
                </SelectTrigger>
                <SelectContent>
                  {SPACES_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground mt-1">
                {t('spacesDescription')}
              </p>
            </div>

            <div>
              <Label htmlFor="lossFunction">{t('lossFunction')}</Label>
              <Select value={formData.lossFunction} onValueChange={(value) => setFormData({ ...formData, lossFunction: value })}>
                <SelectTrigger>
                  <SelectValue placeholder={t('selectLossFunction')} />
                </SelectTrigger>
                <SelectContent>
                  {LOSS_FUNCTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground mt-1">
                {t('lossFunctionDescription')}
              </p>
            </div>

            <div>
              <Label htmlFor="timerange">{t('timerange')} (Optional)</Label>
              <Input
                id="timerange"
                type="text"
                value={formData.timerange}
                onChange={(e) => setFormData({ ...formData, timerange: e.target.value })}
                placeholder="20210101-20211231"
              />
              <p className="text-sm text-muted-foreground mt-1">
                {t('timerangeDescription')}
              </p>
            </div>

            <div>
              <Label htmlFor="jobWorkers">{t('jobWorkers')} (Optional)</Label>
              <Input
                id="jobWorkers"
                type="number"
                min="1"
                value={formData.jobWorkers}
                onChange={(e) => setFormData({ ...formData, jobWorkers: e.target.value })}
                placeholder={t('jobWorkersPlaceholder')}
              />
              <p className="text-sm text-muted-foreground mt-1">
                {t('jobWorkersDescription')}
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start">
                <Info className="h-5 w-5 text-blue-500 mr-2 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-blue-800">{t('optimizationTip.title')}</h4>
                  <p className="text-sm text-blue-700 mt-1">
                    {t('optimizationTip.description')}
                  </p>
                </div>
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
            {t('createHyperopt')}
          </Button>
        </div>
      </form>
    </div>
  )
}