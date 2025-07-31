'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Upload } from 'lucide-react'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'

async function getConfigs() {
  const response = await fetch('/api/configs')
  if (!response.ok) throw new Error('Failed to fetch configs')
  return response.json()
}

export default function ConfigsPage() {
  const { data: configs, isLoading, refetch } = useQuery({
    queryKey: ['configs'],
    queryFn: getConfigs,
  })

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch('/api/configs', {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        refetch()
      }
    } catch (error) {
      console.error('Failed to upload config:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">配置管理</h1>
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
        <h1 className="text-3xl font-bold">配置管理</h1>
        <Button asChild>
          <label className="cursor-pointer">
            <Upload className="w-4 h-4 mr-2" />
            上传配置
            <input
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleFileUpload}
            />
          </label>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {configs?.map((config: any) => (
          <Card key={config.id}>
            <CardHeader>
              <CardTitle className="text-lg">{config.filename}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {config.description && (
                  <div>
                    <span className="text-sm text-muted-foreground">描述：</span>
                    <span className="text-sm">{config.description}</span>
                  </div>
                )}
                <div>
                  <span className="text-sm text-muted-foreground">创建时间：</span>
                  <span className="text-sm">
                    {format(new Date(config.createdAt), 'PP', { locale: zhCN })}
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
