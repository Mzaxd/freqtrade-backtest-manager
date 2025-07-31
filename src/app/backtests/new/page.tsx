'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useMutation } from '@tanstack/react-query'

async function getStrategies() {
  const response = await fetch('/api/strategies')
  if (!response.ok) throw new Error('Failed to fetch strategies')
  return response.json()
}

async function getConfigs() {
  const response = await fetch('/api/configs')
  if (!response.ok) throw new Error('Failed to fetch configs')
  return response.json()
}

async function createBacktest(data: any) {
  const response = await fetch('/api/backtests', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) throw new Error('Failed to create backtest')
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

  const { data: strategies } = useQuery({
    queryKey: ['strategies'],
    queryFn: getStrategies,
  })

  const { data: configs } = useQuery({
    queryKey: ['configs'],
    queryFn: getConfigs,
  })

  const mutation = useMutation({
    mutationFn: createBacktest,
    onSuccess: (data) => {
      router.push(`/backtests/${data.id}`)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    mutation.mutate(formData)
  }

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <h1 className="text-3xl font-bold mb-6">新建回测</h1>

      <Card>
        <CardHeader>
          <CardTitle>回测配置</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="name">任务名称</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="例如：BTC策略测试"
              />
            </div>

            <div>
              <Label htmlFor="strategy">选择策略</Label>
              <Select
                value={formData.strategyId}
                onValueChange={(value: string) => setFormData({ ...formData, strategyId: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择策略" />
                </SelectTrigger>
                <SelectContent>
                  {strategies?.map((strategy: any) => (
                    <SelectItem key={strategy.id} value={strategy.id.toString()}>
                      {strategy.className} {strategy.description && `(${strategy.description})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="config">选择配置</Label>
              <Select
                value={formData.configId}
                onValueChange={(value: string) => setFormData({ ...formData, configId: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择配置" />
                </SelectTrigger>
                <SelectContent>
                  {configs?.map((config: any) => (
                    <SelectItem key={config.id} value={config.id.toString()}>
                      {config.filename} {config.description && `(${config.description})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="timerangeStart">开始时间</Label>
                <Input
                  id="timerangeStart"
                  type="date"
                  value={formData.timerangeStart}
                  onChange={(e) => setFormData({ ...formData, timerangeStart: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="timerangeEnd">结束时间</Label>
                <Input
                  id="timerangeEnd"
                  type="date"
                  value={formData.timerangeEnd}
                  onChange={(e) => setFormData({ ...formData, timerangeEnd: e.target.value })}
                />
              </div>
            </div>

            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? '创建中...' : '创建回测'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
