'use client'

import React, { useEffect, useState } from 'react'
import { useForm, Controller, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useRouter } from 'next/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Info, Loader2, Save, Star } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Card, CardContent } from '@/components/ui/card'

// 定义配置参数的接口
interface Param {
  type: string
  default: any
  description: string
  category: string
  allowed_values?: any[]
}

interface ConfigFile {
  [key: string]: Param
}

// 定义表单的 props
interface NewConfigFormProps {
  initialData?: {
    id: number
    name: string
    description: string | null
    data: any
  }
}

// 使用一个更灵活的 Zod schema 来处理动态数据
const formSchema = z.object({
    name: z.string().min(1, '配置名称不能为空'),
    description: z.string().optional(),
    data: z.record(z.string(), z.any()), // 允许 data 是一个包含任意键值对的对象
});


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
    throw new Error(errorData.details || 'Failed to save configuration')
  }

  return response.json()
}

const categoryTranslations: Record<string, string> = {
    main: '核心配置',
    exchange: '交易所',
    pairlist: '交易对列表',
    risk_management: '风险管理',
    trading_behavior: '交易行为',
    api_server: 'API 服务器',
    notifications: '通知',
    edge: '边缘计算',
    freqai: 'FreqAI 机器学习',
    experimental: '实验性功能',
    data: '数据配置',
    strategy: '策略配置',
    other: '其他'
};


const NewConfigForm: React.FC<NewConfigFormProps> = ({ initialData }) => {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [params, setParams] = useState<ConfigFile | null>(null)

  useEffect(() => {
    const fetchParams = async () => {
      const res = await fetch('/freqtrade-config-parameters.json')
      const data: ConfigFile = await res.json()
      setParams(data)
    }
    fetchParams()
  }, [])
  

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData ?
    {
        name: initialData.name,
        description: initialData.description || "",
        data: initialData.data
    } : {
        name: "",
        description: "",
        data: Object.entries(params || {}).reduce((acc, [key, param]) => ({...acc, [key]: param.default}), {})
    },
  });

  useEffect(() => {
      // 当 initialData 或 params 加载后，重置表单默认值
      if (params) {
          const defaultData = Object.entries(params).reduce(
              (acc, [key, param]) => ({...acc, [key]: param.default}), {}
          );
          reset(initialData ? 
            { name: initialData.name, description: initialData.description || "", data: {...defaultData, ...initialData.data} } :
            { name: "", description: "", data: defaultData }
          );
      }
  }, [initialData, params, reset]);

  const mutation = useMutation({
    mutationFn: saveConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey:['configs']})
      router.push('/configs')
      // Show success toast
    },
    onError: (error) => {
      console.error(error)
      // Show error toast
    },
  })

  const onSubmit = (formData: any) => {
    // 移除未定义或空的字段，以避免覆盖后端默认值
    const cleanedData = { ...formData };
    if (initialData?.id) {
        cleanedData.id = initialData.id;
    }
    mutation.mutate({ data: cleanedData, id: initialData?.id })
  }

  if (!params) {
    return (
      <div className="flex justify-center items-center py-10">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="ml-4 text-muted-foreground">正在加载配置项...</p>
      </div>
    )
  }

  const groupedParams = Object.entries(params).reduce((acc, [key, value]) => {
    const category = value.category || 'other'
    if (!acc[category]) {
      acc[category] = {}
    }
    acc[category][key] = value
    return acc
  }, {} as Record<string, ConfigFile>)

  const renderField = (name: string, param: Param) => {
    const fieldName = `data.${name}` as const;
    const error = (errors.data as any)?.[name]?.message;

    const fieldLabel = (
        <Label htmlFor={fieldName} className="flex items-center">
            {name}
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Info className="h-4 w-4 ml-2 text-muted-foreground cursor-pointer" />
                    </TooltipTrigger>
                    <TooltipContent>
                        <p className="max-w-xs">{param.description}</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        </Label>
    );

    switch (param.type) {
      case 'Boolean':
        return (
          <Controller
            name={fieldName}
            control={control}
            render={({ field }) => (
              <div className="flex items-center space-x-2 mt-2">
                {fieldLabel}
                <Switch
                  checked={Boolean(field.value)}
                  onCheckedChange={field.onChange}
                />
                {error && <p className="text-sm text-destructive">{error}</p>}
              </div>
            )}
          />
        )
      case 'Dict':
      case 'List of Dicts':
      case 'Object':
        return (
          <Controller
            name={fieldName}
            control={control}
            render={({ field }) => {
              const textareaRef = React.useRef<HTMLTextAreaElement>(null);
              
              const combinedRef = (el: HTMLTextAreaElement) => {
                  field.ref(el);
                  (textareaRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = el;
              };

              React.useLayoutEffect(() => {
                  if (textareaRef.current) {
                      textareaRef.current.style.height = '0px'; // Reset before calculating
                      const scrollHeight = textareaRef.current.scrollHeight;
                      textareaRef.current.style.height = scrollHeight + 'px';
                  }
              }, [field.value]);

              return (
                  <div>
                      {fieldLabel}
                      <Textarea
                          ref={combinedRef}
                          name={field.name}
                          onBlur={field.onBlur}
                          value={typeof field.value === 'object' && field.value !== null ? JSON.stringify(field.value, null, 2) : String(field.value ?? '')}
                          onChange={(e) => {
                              try {
                                  field.onChange(JSON.parse(e.target.value));
                              } catch {
                                  field.onChange(e.target.value);
                              }
                          }}
                          className="mt-1 font-mono overflow-y-hidden resize-none"
                          rows={1}
                      />
                      {error && <p className="text-sm text-destructive">{error}</p>}
                  </div>
              )
            }}
          />
        )
      default: // String, Integer, Float etc.
        return (
          <Controller
            name={fieldName}
            control={control}
            render={({ field }) => (
              <div>
                {fieldLabel}
                <Input
                  {...field}
                  id={fieldName}
                  type={param.type.includes('Integer') || param.type.includes('Float') ? 'number' : 'text'}
                  // `onChange` is already handled by `field`
                  value={field.value === null || field.value === undefined ? '' : String(field.value)}
                  onChange={(e) => {
                      const val = param.type.includes('Integer') || param.type.includes('Float')
                                  ? (e.target.value === '' ? null : Number(e.target.value))
                                  : e.target.value;
                      field.onChange(val);
                  }}
                  className="mt-1"
                />
                {error && <p className="text-sm text-destructive">{error}</p>}
              </div>
            )}
          />
        )
    }
  }


  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        <Card>
            <CardContent className="pt-6">
                 <div className="space-y-4">
                    <Controller
                        name="name"
                        control={control}
                        render={({ field }) => (
                            <div>
                                <Label htmlFor="name">配置名称</Label>
                                <Input id="name" {...field} className="mt-1" placeholder="例如: 稳定币对剥头皮策略 V1" />
                                {errors.name && <p className="text-sm text-destructive">{String(errors.name.message)}</p>}
                            </div>
                        )}
                    />
                    <Controller
                        name="description"
                        control={control}
                        render={({ field }) => (
                             <div>
                                <Label htmlFor="description">描述 (可选)</Label>
                                <Textarea id="description" {...field} className="mt-1" placeholder="关于这个配置的一些说明，方便以后记起它的用途" />
                             </div>
                        )}
                    />
                </div>
            </CardContent>
        </Card>
      
      <Accordion type="multiple" defaultValue={['main']} className="w-full">
        {Object.entries(groupedParams).map(([category, params]) => (
          <AccordionItem value={category} key={category}>
            <AccordionTrigger className="capitalize text-lg font-medium hover:no-underline">
                 <div className="flex items-center">
                    {category === 'main' && <Star className="h-5 w-5 mr-3 text-yellow-500 fill-yellow-400" />}
                    {categoryTranslations[category] || category.replace(/_/g, ' ')}
                 </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 p-4">
                {Object.entries(params).map(([name, param]) => (
                  <div key={name}>{renderField(name, param)}</div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
      <div className="flex justify-end">
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          {initialData ? '保存更改' : '创建配置'}
        </Button>
      </div>
    </form>
  )
}

export default NewConfigForm;