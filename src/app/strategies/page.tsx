'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Upload } from 'lucide-react'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'

async function getStrategies() {
  const response = await fetch('/api/strategies')
  if (!response.ok) throw new Error('Failed to fetch strategies')
  return response.json()
}

export default function StrategiesPage() {
  const { data: strategies, isLoading, refetch } = useQuery({
    queryKey: ['strategies'],
    queryFn: getStrategies,
  })

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch('/api/strategies', {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        refetch()
      }
    } catch (error) {
      console.error('Failed to upload strategy:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">策略管理</h1>
        <div className="animate-pulse">
          <Card>
            <CardContent className="p-6">
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">策略管理</h1>
        <Button asChild>
          <label className="cursor-pointer">
            <Upload className="w-4 h-4 mr-2" />
            上传策略
            <input
              type="file"
              accept=".py"
              className="hidden"
              onChange={handleFileUpload}
            />
          </label>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {strategies?.map((strategy: any) => (
          <Card key={strategy.id}>
            <CardHeader>
              <CardTitle className="text-lg">{strategy.className}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div>
                  <span className="text-sm text-muted-foreground">文件名：</span>
                  <span className="text-sm">{strategy.filename}</span>
                </div>
                {strategy.description && (
                  <div>
                    <span className="text-sm text-muted-foreground">描述：</span>
                    <span className="text-sm">{strategy.description}</span>
                  </div>
                )}
                <div>
                  <span className="text-sm text-muted-foreground">创建时间：</span>
                  <span className="text-sm">
                    {format(new Date(strategy.createdAt), 'PP', { locale: zhCN })}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
