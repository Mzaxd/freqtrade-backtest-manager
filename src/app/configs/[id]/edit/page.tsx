'use client'

import { useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import NewConfigForm from '@/components/NewConfigForm'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Loader2, AlertTriangle } from 'lucide-react'

// 定义配置对象的完整类型
interface Config {
  id: number
  name: string
  description: string | null
  data: any
  createdAt: string
  updatedAt: string
}

// API调用函数：获取单个配置
const fetchConfig = async (id: string): Promise<Config> => {
  const response = await fetch(`/api/configs/${id}`)
  if (!response.ok) {
     const errorData = await response.json();
    throw new Error(errorData.details || 'Failed to fetch config details');
  }
  const result = await response.json()
  return result.data
}

export default function EditConfigPage() {
  const params = useParams()
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const { data: config, isLoading, isError, error } = useQuery<Config>({
    queryKey: ['config', id],
    queryFn: () => {
      if (!id) {
        return Promise.reject(new Error("No ID provided"));
      }
      return fetchConfig(id);
    },
    enabled: !!id, // 只有在 id 存在时才执行查询
  })

  return (
    <div className="container mx-auto p-6">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">编辑配置</CardTitle>
            <CardDescription>
              修改您的 Freqtrade 配置集。
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading && (
               <div className="flex justify-center items-center py-10">
                 <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                 <p className="ml-4 text-muted-foreground">正在加载配置...</p>
               </div>
            )}
             {isError && (
                <div className="text-destructive bg-destructive/10 p-4 rounded-md flex items-center">
                   <AlertTriangle className="h-5 w-5 mr-3" />
                   <div>
                    <p className="font-semibold">加载失败</p>
                    <p className="text-sm">{error?.message || '无法从服务器获取配置数据。'}</p>
                   </div>
                </div>
            )}
            {config && <NewConfigForm initialData={config} />}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}