'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Upload, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { useState } from 'react'
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

async function getStrategies() {
  const response = await fetch('/api/strategies')
  if (!response.ok) throw new Error('获取策略列表失败')
  return response.json()
}

async function deleteStrategy(id: number): Promise<any> {
  const response = await fetch(`/api/strategies/${id}`, {
    method: 'DELETE',
  })
  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.error || '删除策略失败')
  }
  return response.json()
}

export default function StrategiesPage() {
  const queryClient = useQueryClient()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedStrategy, setSelectedStrategy] = useState<any>(null)

  const { data: strategies, isLoading } = useQuery({
    queryKey: ['strategies'],
    queryFn: getStrategies,
  })

  const { mutate: performDelete, isPending: isDeleting, error } = useMutation({
    mutationFn: deleteStrategy,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['strategies'] })
      setIsDialogOpen(false)
      setSelectedStrategy(null)
    },
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
        queryClient.invalidateQueries({ queryKey: ['strategies'] })
      }
    } catch (uploadError) {
      console.error('上传策略失败:', uploadError)
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
              <CardTitle className="text-lg flex justify-between items-center">
                {strategy.className}
                 <AlertDialog open={isDialogOpen && selectedStrategy?.id === strategy.id} onOpenChange={(open) => {
                   if (!open) {
                     setSelectedStrategy(null)
                     setIsDialogOpen(false)
                   }
                 }}>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={() => {
                        setSelectedStrategy(strategy)
                        setIsDialogOpen(true)
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>确认删除策略</AlertDialogTitle>
                      <AlertDialogDescription>
                        您确定要删除策略 "{selectedStrategy?.className}" 吗？此操作不可撤销。
                        {error && <p className="text-red-500 mt-2">错误: {(error as Error).message}</p>}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>取消</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => performDelete(selectedStrategy.id)}
                        className="bg-red-500 hover:bg-red-600"
                        disabled={isDeleting}
                      >
                        {isDeleting ? '删除中...' : '删除'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardTitle>
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
