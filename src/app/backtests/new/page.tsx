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
  return Array.isArray(data) ? data : data.data || []
}

async function getConfigs() {
  const response = await fetch('/api/configs')
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to fetch configs')
  }
  const data = await response.json()
  return data.data || []
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
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: '',
    strategyId: '',
    configId: '',
    timerangeStart: '',
    timerangeEnd: '',
  })
  const [error, setError] = useState<string | null>(null)

  const { data: strategies, isLoading: strategiesLoading, error: strategiesError } = useQuery({
    queryKey: ['strategies'],
    queryFn: getStrategies,
  })

  const { data: configs, isLoading: configsLoading, error: configsError } = useQuery({
    queryKey: ['configs'],
    queryFn: getConfigs,
  })

  const mutation = useMutation({
    mutationFn: createBacktest,
    onSuccess: (data) => {
      router.push(`/backtests/${data.id}`)
    },
    onError: (error: Error) => {
      setError(error.message)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // 验证表单
    if (!formData.name.trim()) {
      setError('任务名称不能为空')
      return
    }

    if (!formData.strategyId) {
      setError('请选择策略')
      return
    }

    if (!formData.configId) {
      setError('请选择配置')
      return
    }

    if (!formData.timerangeStart || !formData.timerangeEnd) {
      setError('请选择时间范围')
      return
    }

    const start = new Date(formData.timerangeStart)
    const end = new Date(formData.timerangeEnd)

    if (start >= end) {
      setError('结束时间必须晚于开始时间')
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
        <h1 className="text-3xl font-bold mb-6">新建回测</h1>
  
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
            <h3 className="text-lg font-medium text-red-800">加载失败</h3>
          </div>
          <p className="mt-2 text-sm text-red-700">
            {(strategiesError || configsError)?.message || '无法加载数据，请稍后重试'}
          </p>
        </div>
      </div>
    )
  }

  if (strategiesLoading || configsLoading) {
    return (
      <div className="container mx-auto p-6 max-w-2xl">
        <h1 className="text-3xl font-bold mb-6">新建回测</h1>
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <h1 className="text-3xl font-bold mb-6">新建回测</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>基本信息</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">任务名称</Label>
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="输入回测任务名称"
              />
            </div>

            <div>
              <Label htmlFor="strategy">策略</Label>
              <Select value={formData.strategyId} onValueChange={(value) => setFormData({ ...formData, strategyId: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="选择策略" />
                </SelectTrigger>
                <SelectContent>
                  {strategies?.map((strategy: Strategy) => (
                    <SelectItem key={strategy.id} value={strategy.id}>
                      {strategy.className}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="config">配置</Label>
              <Select value={formData.configId} onValueChange={(value) => setFormData({ ...formData, configId: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="选择配置" />
                </SelectTrigger>
                <SelectContent>
                  {configs?.map((config: Config) => (
                    <SelectItem key={config.id} value={config.id}>
                      {config.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start">开始时间</Label>
                <Input
                  id="start"
                  type="datetime-local"
                  value={formData.timerangeStart}
                  onChange={(e) => setFormData({ ...formData, timerangeStart: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="end">结束时间</Label>
                <Input
                  id="end"
                  type="datetime-local"
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
              <h3 className="text-lg font-medium text-red-800">错误</h3>
            </div>
            <p className="mt-2 text-sm text-red-700">{error}</p>
          </div>
        )}

        <div className="flex justify-end space-x-4">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            取消
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            创建回测
          </Button>
        </div>
      </form>
    </div>
  )
}
