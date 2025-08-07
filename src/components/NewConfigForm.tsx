'use client'

import React, { useEffect, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useRouter } from 'next/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Info, Loader2, Save, Star, Code, FileText } from 'lucide-react'
import toast from 'react-hot-toast'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

// 定义配置参数的接口
interface Param {
  type: string
  default: any
  description: string
  category: string
  allowed_values?: any[]
  ui_visible?: boolean // 新增 ui_visible 字段
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
    data: z.object({}).passthrough(), // 允许 data 是一个包含任意键值对的对象
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
    throw new Error(errorData.error || 'Failed to save configuration')
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
  const [viewMode, setViewMode] = useState<'form' | 'json'>('form');

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialData?.name || "",
      description: initialData?.description || "",
      data: initialData?.data || {},
    },
  });

  useEffect(() => {
    const fetchParams = async () => {
      try {
        const res = await fetch('/freqtrade-config-parameters.json')
        const data: ConfigFile = await res.json()
        setParams(data)
      } catch (error) {
        console.error("Failed to fetch or parse params:", error);
      }
    }
    fetchParams()
  }, [])

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
      toast.success(initialData ? '配置已成功更新！' : '配置已成功创建！');
      router.push('/configs');
    },
    onError: (error) => {
      console.error(error)
      toast.error(`保存配置失败: ${error.message}`)
    },
  })

  const onSubmit = (formData: z.infer<typeof formSchema>) => {
    const cleanedData: any = { ...formData, data: formData.data };
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

  const groupedParams = Object.entries(params)
    .filter(([, param]) => param.ui_visible === true) // 仅保留 ui_visible 为 true 的配置项
    .reduce((acc, [key, value]) => {
      const category = value.category || 'other'
      if (!acc[category]) {
        acc[category] = {}
      }
      acc[category][key] = value
      return acc
    }, {} as Record<string, ConfigFile>)

  const renderField = (name: string, param: Param) => {
    const fieldName = `data.${name}` as const;

    const renderInput = (type: string) => (
        <Controller
            name={fieldName}
            control={control}
            render={({ field }) => (
                <Input
                    type={type}
                    {...field}
                    value={String(field.value ?? '')}
                    onChange={(e) => {
                        const value = type === 'number' ? parseFloat(e.target.value) : e.target.value;
                        field.onChange(value);
                    }}
                    className="mt-1"
                />
            )}
        />
    );

    const renderSwitch = () => (
        <Controller
            name={fieldName}
            control={control}
            render={({ field }) => (
                <div className="flex items-center h-10">
                    <Switch
                        checked={!!field.value}
                        onCheckedChange={field.onChange}
                    />
                </div>
            )}
        />
    );

    const renderTextarea = () => (
      <Controller
        name={fieldName}
        control={control}
        render={({ field }) => {
          const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);

          const combinedRef = (el: HTMLTextAreaElement) => {
            field.ref(el);
            textareaRef.current = el;
          };

          React.useLayoutEffect(() => {
            if (textareaRef.current) {
              textareaRef.current.style.height = 'auto';
              textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
            }
          }, [field.value]);

          return (
            <Textarea
              {...field}
              ref={combinedRef}
              value={typeof field.value === 'object' ? JSON.stringify(field.value, null, 2) : String(field.value ?? '')}
              onChange={(e) => {
                try {
                  const parsed = JSON.parse(e.target.value);
                  field.onChange(parsed);
                } catch (error) {
                  field.onChange(e.target.value);
                }
              }}
              className="mt-1 font-mono resize-none overflow-hidden"
              rows={1}
            />
          );
        }}
      />
    );

    const renderSelect = (options: any[]) => (
         <Controller
            name={fieldName}
            control={control}
            render={({ field }) => (
                <select {...field} value={String(field.value ?? '')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50">
                    {options.map(option => <option key={option} value={option}>{option}</option>)}
                </select>
            )}
        />
    )
    
    let fieldElement;
    const normalizedType = param.type.toLowerCase();

    if (param.allowed_values) {
        fieldElement = renderSelect(param.allowed_values);
    } else if (name === 'stake_amount') {
        fieldElement = renderInput('text'); // 'stake_amount' 的特例处理
    } else if (normalizedType.includes('string')) {
        fieldElement = renderInput('text');
    } else if (normalizedType.includes('boolean')) {
        fieldElement = renderSwitch();
    } else if (normalizedType.includes('integer') || normalizedType.includes('float') || normalizedType.includes('positive float')) {
        fieldElement = renderInput('number');
    } else if (normalizedType.includes('dict') || normalizedType.includes('object') || normalizedType.includes('list')) {
        fieldElement = renderTextarea();
    } else {
        fieldElement = renderInput('text');
    }

    return (
        <div key={name} className="space-y-2">
            <div className="flex items-center">
                <Label htmlFor={name} className="capitalize">{name.replace(/_/g, ' ')}</Label>
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Info className="h-4 w-4 ml-2 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                            <p className="max-w-xs">{param.description}</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>
            {fieldElement}
            {errors.data?.[name] && <p className="text-sm text-destructive">{String(errors.data[name].message)}</p>}
        </div>
    );
};


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
      
      {viewMode === 'form' ? (
        <Accordion type="multiple" defaultValue={['main']} className="w-full">
          {Object.entries(groupedParams)
            .map(([category, params]) => (
              <AccordionItem value={category} key={category}>
                <AccordionTrigger className="capitalize text-lg font-medium hover:no-underline">
                    <div className="flex items-center">
                        {category === 'main' && <Star className="h-5 w-5 mr-3 text-yellow-500 fill-yellow-400" />}
                        {categoryTranslations[category] || category.replace(/_/g, ' ')}
                    </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 p-4">
                    {Object.entries(params)
                      .map(([name, param]) => (
                        <div key={name}>{renderField(name, param)}</div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
          ))}
        </Accordion>
      ) : (
        <Card>
          <CardHeader>
             <CardTitle>JSON 配置</CardTitle>
             <CardDescription>直接编辑配置的 JSON 源代码。请确保格式正确。</CardDescription>
          </CardHeader>
          <CardContent>
              <Controller
                name="data"
                control={control}
                render={({ field }) => {
                    const [jsonString, setJsonString] = useState(() => JSON.stringify(field.value, null, 2));
                    const [error, setError] = useState<string | null>(null);

                    useEffect(() => {
                        const formValueString = JSON.stringify(field.value, null, 2);
                        try {
                            JSON.parse(jsonString);
                             if (jsonString !== formValueString) {
                                setJsonString(formValueString);
                             }
                        } catch (e) {
                            // If current jsonString is invalid, don't overwrite it
                        }
                    }, [field.value, jsonString]);

                    const handleJsonChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
                        const newJsonString = e.target.value;
                        setJsonString(newJsonString);
                        try {
                            const parsed = JSON.parse(newJsonString);
                            setValue('data', parsed, { shouldValidate: true, shouldDirty: true });
                            setError(null);
                        } catch (err) {
                            setError("JSON 格式错误: " + (err as Error).message);
                        }
                    };
                    
                    return (
                        <div>
                            <Label htmlFor="json-editor">配置 JSON</Label>
                            <Textarea
                                 id="json-editor"
                                 value={jsonString}
                                 onChange={handleJsonChange}
                                 className="mt-1 font-mono h-[500px]"
                                 placeholder="在此输入或粘贴 JSON 配置"
                            />
                            {error && <p className="text-sm text-destructive mt-2">{error}</p>}
                             {errors.data && <p className="text-sm text-destructive mt-2">{String(errors.data.message)}</p>}
                        </div>
                    );
                }}
              />
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end space-x-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => setViewMode(viewMode === 'form' ? 'json' : 'form')}
        >
          {viewMode === 'form' ? (
            <>
              <Code className="mr-2 h-4 w-4" /> 查看 JSON
            </>
          ) : (
            <>
              <FileText className="mr-2 h-4 w-4" /> 查看表单
            </>
          )}
        </Button>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          {initialData ? '保存更改' : '创建配置'}
        </Button>
      </div>
    </form>
  )
}

export default NewConfigForm;
