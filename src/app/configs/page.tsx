'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { PlusCircle, Edit, Trash2, AlertTriangle, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
} from "@/components/ui/alert-dialog"
import { useState } from 'react'
import toast from 'react-hot-toast'

interface ConfigListItem {
  id: number
  name: string
  description: string | null
  createdAt: string
  updatedAt: string
}

const fetchConfigs = async (): Promise<ConfigListItem[]> => {
  const response = await fetch('/api/configs')
  if (!response.ok) {
    throw new Error('网络响应异常')
  }
  const result = await response.json()
  return result.data
}

const deleteConfig = async (id: number): Promise<void> => {
  const response = await fetch(`/api/configs/${id}`, {
    method: 'DELETE',
  })
  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.error || '删除配置失败')
  }
}

export default function ConfigsPage() {
  const queryClient = useQueryClient()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedConfig, setSelectedConfig] = useState<ConfigListItem | null>(null)

  const { data: configs, isLoading, isError, error: queryError } = useQuery<ConfigListItem[]>({
    queryKey: ['configs'],
    queryFn: fetchConfigs,
  })

  const { mutate: deleteMutate, isPending: isDeleting, error: deleteError, reset } = useMutation({
    mutationFn: deleteConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['configs'] })
      setIsDialogOpen(false)
      setSelectedConfig(null)
    },
    onError: (error: Error) => {
      toast.error(`删除失败: ${error.message}`)
    }
  })

  const handleOpenDialog = (config: ConfigListItem) => {
    setSelectedConfig(config)
    setIsDialogOpen(true)
    reset() // 重置错误状态
  }

  const handleDelete = () => {
    if (selectedConfig) {
      deleteMutate(selectedConfig.id)
    }
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">配置管理</h1>
        <Button asChild>
          <Link href="/configs/new">
            <PlusCircle className="mr-2 h-4 w-4" />
            新建配置
          </Link>
        </Button>
      </div>

      {isLoading && (
        <div className="flex justify-center items-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="ml-4 text-muted-foreground">正在加载配置列表...</p>
        </div>
      )}

      {isError && (
        <div className="text-destructive bg-destructive/10 p-4 rounded-md flex items-center">
           <AlertTriangle className="h-5 w-5 mr-3" />
           <div>
            <p className="font-semibold">加载失败</p>
            <p className="text-sm">{queryError?.message || '无法从服务器获取配置数据。'}</p>
           </div>
        </div>
      )}

      {configs && !configs.length && !isLoading && (
         <div className="text-center py-12 border-2 border-dashed rounded-lg">
            <h3 className="text-xl font-medium">没有找到任何配置</h3>
            <p className="text-muted-foreground mt-2 mb-6">开始您的第一次回测，请先创建一个新的配置吧！</p>
            <Button asChild>
                <Link href="/configs/new">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    创建第一个配置
                </Link>
            </Button>
         </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {configs?.map((config) => (
          <Card key={config.id}>
            <CardHeader>
              <CardTitle className="truncate">{config.name}</CardTitle>
              <CardDescription className="truncate h-5">{config.description || '暂无描述'}</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
               <p>最后更新: {new Date(config.updatedAt).toLocaleString()}</p>
                 <div className="flex justify-end space-x-2 mt-4">
                    <Button variant="outline" size="sm" asChild>
                        <Link href={`/configs/${config.id}/edit`}>
                            <Edit className="h-4 w-4" />
                        </Link>
                    </Button>
                    <AlertDialog open={isDialogOpen && selectedConfig?.id === config.id} onOpenChange={setIsDialogOpen}>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" onClick={() => handleOpenDialog(config)}>
                           <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>您确定要删除吗?</AlertDialogTitle>
                          <AlertDialogDescription>
                            此操作无法撤销。这将永久删除配置 “{selectedConfig?.name}”。
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>取消</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-destructive hover:bg-destructive/90"
                            disabled={isDeleting}
                          >
                           {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "确定删除"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                 </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
