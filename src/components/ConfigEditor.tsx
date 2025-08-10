'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { useTheme } from 'next-themes'
import CodeMirror from '@uiw/react-codemirror'
import { json } from '@codemirror/lang-json'
import { oneDark } from '@codemirror/theme-one-dark'
import { pinyin } from 'pinyin'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Loader2, Save } from 'lucide-react'
import ConfigDocumentation from './ConfigDocumentation'

// 定义表单的 props
interface ConfigEditorProps {
  initialData?: {
    id: number
    name: string
    description: string | null
    data: any
  }
  isNew: boolean
}

// API调用函数
const saveConfig = async ({ data, id }: { data: any, id?: number }) => {
  const url = id ? `/api/configs/${id}` : '/api/configs'
  const method = id ? 'PUT' : 'POST'
  
  const response = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
     const errorData = await response.json()
    throw new Error(errorData.error || 'Failed to save configuration')
  }

  return response.json()
}

const generateSafeFilename = (name: string): string => {
  const pinyinName = pinyin(name, {
    style: 'normal',
  }).join('');
  return `${pinyinName.replace(/[\s\W]/g, '_')}.json`;
}


const ConfigEditor: React.FC<ConfigEditorProps> = ({ initialData, isNew }) => {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { theme } = useTheme()

  const [name, setName] = useState(initialData?.name || '')
  const [description, setDescription] = useState(initialData?.description || '')
  const [jsonContent, setJsonContent] = useState('')
  const [isLoadingTemplate, setIsLoadingTemplate] = useState(isNew)

  useEffect(() => {
    if (isNew) {
      const fetchTemplate = async () => {
        try {
          const res = await fetch(encodeURI('/config示例文件.json'))
          const template = await res.json()
          setJsonContent(JSON.stringify(template, null, 2))
        } catch (error) {
          console.error("Failed to fetch config template:", error)
          toast.error("加载配置模板失败！")
          setJsonContent('{}')
        } finally {
          setIsLoadingTemplate(false)
        }
      }
      fetchTemplate()
    } else if (initialData) {
        setJsonContent(JSON.stringify(initialData.data, null, 2))
    }
  }, [isNew, initialData])

  const mutation = useMutation({
    mutationFn: saveConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey:['configs']})
      toast.success(isNew ? '配置已成功创建！' : '配置已成功更新！');
      router.push('/configs');
    },
    onError: (error) => {
      console.error(error)
      toast.error(`保存配置失败: ${error.message}`)
    },
  })

  const handleSubmit = () => {
    if (!name.trim()) {
        toast.error("配置名称不能为空！");
        return;
    }

    let parsedJson
    try {
      parsedJson = JSON.parse(jsonContent)
    } catch (error) {
      toast.error("JSON 配置格式无效，请更正后再保存。");
      console.error("Invalid JSON format:", error);
      return;
    }

    const filename = generateSafeFilename(name);
    const submissionData = {
        name,
        description,
        filename,
        config: parsedJson
    };

    mutation.mutate({ data: submissionData, id: initialData?.id })
  }

  return (
    <div className="flex h-[calc(100vh-theme-switcher-height)]"> {/* Adjust height as needed */}
      <div className="flex-grow w-2/3 p-6 flex flex-col">
        <Card className="flex-grow flex flex-col">
          <CardHeader>
            <CardTitle>{isNew ? '创建新配置' : '编辑配置'}</CardTitle>
            <CardDescription>通过直接编辑 JSON 来管理您的 Freqtrade 配置。</CardDescription>
          </CardHeader>
          <CardContent className="flex-grow flex flex-col gap-4">
            <div className="space-y-2">
              <Label htmlFor="config-name">配置名称</Label>
              <Input
                id="config-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例如: 稳定币对剥头皮策略 V1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="config-description">描述 (可选)</Label>
              <Textarea
                id="config-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="关于这个配置的一些说明，方便以后记起它的用途"
              />
            </div>
            <div className="space-y-2 flex-grow flex flex-col">
              <Label htmlFor="json-editor">配置 JSON</Label>
              {isLoadingTemplate ? (
                  <div className="flex justify-center items-center h-full">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    <p className="ml-3 text-muted-foreground">加载模板...</p>
                  </div>
              ) : (
                <CodeMirror
                    id="json-editor"
                    value={jsonContent}
                    height="100%"
                    extensions={[json()]}
                    theme={theme === 'dark' ? oneDark : 'light'}
                    className="mt-1 border rounded-md flex-grow"
                    onChange={(value) => setJsonContent(value)}
                />
              )}
            </div>
          </CardContent>
        </Card>
        <div className="flex justify-end mt-4">
          <Button onClick={handleSubmit} disabled={mutation.isPending}>
            {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {isNew ? '创建配置' : '保存更改'}
          </Button>
        </div>
      </div>
      <div className="w-1/3 h-full overflow-y-auto">
        <ConfigDocumentation />
      </div>
    </div>
  )
}

export default ConfigEditor