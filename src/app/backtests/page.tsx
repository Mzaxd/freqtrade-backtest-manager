'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import Link from 'next/link'

async function getBacktests() {
  const response = await fetch('/api/backtests')
  if (!response.ok) throw new Error('Failed to fetch backtests')
  return response.json()
}

export default function BacktestsPage() {
  const { data: backtests, isLoading } = useQuery({
    queryKey: ['backtests'],
    queryFn: getBacktests,
  })

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

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">回测历史</h1>
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
        <h1 className="text-3xl font-bold">回测历史</h1>
        <Link href="/backtests/new">
          <Button>新建回测</Button>
        </Link>
      </div>

      <div className="space-y-4">
        {backtests?.map((backtest: any) => (
          <Card key={backtest.id}>
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-semibold">{backtest.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    策略: {backtest.strategy?.className} • 
                    配置: {backtest.config?.filename}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    创建时间: {format(new Date(backtest.createdAt), 'PPpp', { locale: zhCN })}
                  </p>
                  {backtest.completedAt && (
                    <p className="text-sm text-muted-foreground">
                      完成时间: {format(new Date(backtest.completedAt), 'PPpp', { locale: zhCN })}
                    </p>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <Badge className={getStatusColor(backtest.status)}>
                    {backtest.status}
                  </Badge>
                  <Link href={`/backtests/${backtest.id}`}>
                    <Button variant="outline" size="sm">查看详情</Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
