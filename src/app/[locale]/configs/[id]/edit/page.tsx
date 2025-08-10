'use client'

import { useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import ConfigEditor from '@/components/ConfigEditor'
import { Loader2, AlertTriangle } from 'lucide-react'
import { useTranslations } from 'next-intl'

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
  const t = useTranslations('ConfigEditor');
  const params = useParams()
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const { data: config, isLoading, isError, error } = useQuery<Config>({
    queryKey: ['config', id],
    queryFn: () => {
      if (!id) {
        return Promise.reject(new Error(t('noIdProvided')));
      }
      return fetchConfig(id);
    },
    enabled: !!id, // 只有在 id 存在时才执行查询
  })

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="ml-4 text-muted-foreground">{t('loading')}</p>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-destructive bg-destructive/10 p-6 rounded-md flex items-center">
          <AlertTriangle className="h-6 w-6 mr-4" />
          <div>
            <p className="font-semibold text-lg">{t('loadFailed')}</p>
            <p>{error?.message || t('loadFailedMessage')}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full">
      {config && <ConfigEditor initialData={config} isNew={false} />}
    </div>
  )
}