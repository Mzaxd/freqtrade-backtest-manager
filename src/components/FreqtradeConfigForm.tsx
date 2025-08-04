'use client'

import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Form, FormControl, FormField, FormItem, FormLabel, FormDescription, FormMessage } from '@/components/ui/form'
import { Button } from './ui/button'
import Autocomplete from './Autocomplete'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion'

// 从 FreqtradeConfigForm.tsx 借用类型定义
interface ConfigParameter {
  type: string
  default: any
  allowed_values: any[] | null
  description: string
  properties?: Record<string, ConfigParameter>
}

interface ConfigParameters {
  [key: string]: ConfigParameter
}

/**
 * 递归地将嵌套的配置参数扁平化。
 * @param configParams 原始的配置参数对象。
 * @param prefix 用于构建扁平化键的前缀。
 * @returns 扁平化的配置参数对象。
 */
const flattenConfig = (configParams: ConfigParameters, prefix = ''): ConfigParameters => {
  let flatConfig: ConfigParameters = {}

  for (const key in configParams) {
    if (Object.prototype.hasOwnProperty.call(configParams, key)) {
      const newKey = prefix ? `${prefix}.${key}` : key
      const param = configParams[key]

      if (param.properties && Object.keys(param.properties).length > 0) {
        // 如果有 properties，则递归地将它们扁平化
        const nestedParams = flattenConfig(param.properties, newKey)
        flatConfig = { ...flatConfig, ...nestedParams }
      } else {
        // 否则，直接添加参数
        flatConfig[newKey] = param
      }
    }
  }

  return flatConfig
}

// 动态创建Zod验证Schema
const createDynamicSchema = (config: ConfigParameters): z.ZodObject<any> => {
    const schemaShape: { [key: string]: z.ZodType<any, any> } = {};
    for (const key in config) {
        const param = config[key];
        if (param.type === 'Boolean') {
            schemaShape[key] = z.boolean().default(param.default || false);
        } else if (param.type.includes('Integer')) {
            schemaShape[key] = z.coerce.number().int().default(param.default || 0);
        } else if (param.type.includes('Float')) {
            schemaShape[key] = z.coerce.number().default(param.default || 0);
        } else if (param.allowed_values) {
            schemaShape[key] = z.string().default(param.default || '');
        } else {
            // 对于对象和列表等复杂类型，暂时使用 z.any()
            if (typeof param.default === 'object' && param.default !== null) {
                 schemaShape[key] = z.any().optional().default(param.default);
            } else {
                 schemaShape[key] = z.string().optional().default(param.default || '');
            }
        }
    }
    return z.object(schemaShape);
};


const renderInput = (key: string, param: ConfigParameter, form: any) => {
    const { control } = form

    if (key === 'strategy') {
        return (
            <Autocomplete
                form={form}
                name="strategy"
                label="Strategy"
                description="The trading strategy to use."
                fetchUrl="/api/strategies"
            />
        )
    }

    if (param.type === 'Boolean') {
        return (
            <FormField
                control={control}
                name={key}
                render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                            <FormLabel className="text-base">{key}</FormLabel>
                            <FormDescription>{param.description}</FormDescription>
                        </div>
                        <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                    </FormItem>
                )}
            />
        )
    }

    if (param.allowed_values && param.allowed_values.length > 0) {
        return (
             <FormField
                control={control}
                name={key}
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>{key}</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={String(field.value)}>
                            <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="选择一个值..." />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {param.allowed_values!.map((option: any, index: number) => (
                                    <SelectItem key={`${option}-${index}`} value={String(option)}>
                                        {String(option)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <FormDescription>{param.description}</FormDescription>
                        <FormMessage />
                    </FormItem>
                )}
            />
        )
    }
    
    if (param.type === 'Dict' || param.type === 'Object' || param.type.includes('List')) {
        return (
            <FormField
                control={control}
                name={key}
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>{key}</FormLabel>
                        <FormControl>
                            <Textarea
                                placeholder={param.description}
                                {...field}
                                value={typeof field.value === 'object' ? JSON.stringify(field.value, null, 2) : field.value}
                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                                    try {
                                        field.onChange(JSON.parse(e.target.value));
                                    } catch (error) {
                                        field.onChange(e.target.value);
                                    }
                                }}
                            />
                        </FormControl>
                        <FormDescription>{param.description}</FormDescription>
                        <FormMessage />
                    </FormItem>
                )}
            />
        );
    }

    // 默认回退到文本输入框
    return (
        <FormField
            control={control}
            name={key}
            render={({ field }) => (
                <FormItem>
                    <FormLabel>{key}</FormLabel>
                    <FormControl>
                        <Input
                            type={param.type.includes('Integer') || param.type.includes('Float') ? 'number' : 'text'}
                            placeholder={param.description}
                            {...field}
                            value={field.value ?? ''}
                        />
                    </FormControl>
                     <FormDescription>{param.description}</FormDescription>
                    <FormMessage />
                </FormItem>
            )}
        />
    )
}

const NewConfigForm: React.FC = () => {
    const [flatConfig, setFlatConfig] = useState<ConfigParameters | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const form = useForm();
    
    useEffect(() => {
        const loadAndFlattenConfig = async () => {
            try {
                const response = await fetch('/freqtrade-config-parameters.json')
                if (!response.ok) {
                    throw new Error('无法加载配置文件')
                }
                const data: ConfigParameters = await response.json()
                
                const flattenedData = flattenConfig(data)
                setFlatConfig(flattenedData)

                const schema = createDynamicSchema(flattenedData)
                const defaultValues = schema.parse({})
                
                // 使用 zodResolver 更新表单
                form.reset(defaultValues, {
                    // @ts-ignore
                    resolver: zodResolver(schema),
                    mode: 'onChange'
                });

                console.log('扁平化后的配置:', flattenedData)
                
                setLoading(false)
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : '一个未知的错误发生了'
                setError(errorMessage)
                setLoading(false)
            }
        }

        loadAndFlattenConfig()
    }, [form])

    if (loading) {
        return <div>正在加载和处理配置...</div>
    }

    if (loading) {
        return <div>正在加载和处理配置...</div>
    }

    if (error) {
        return <div className="text-red-500">错误: {error}</div>
    }

    if (!flatConfig) {
        return <div>未找到配置参数。</div>
    }

    const onSubmit = (data: z.infer<ReturnType<typeof createDynamicSchema>>) => {
        console.log('表单已提交:', data)
        // 在这里处理表单提交，例如发送到API
    }
    
    const highPriorityParams = ['bot_name', 'stake_currency', 'stake_amount', 'timeframe', 'strategy', 'max_open_trades', 'dry_run']
    const highPriorityFields = flatConfig ? Object.entries(flatConfig).filter(([key]) => highPriorityParams.includes(key)) : []
    const lowPriorityFields = flatConfig ? Object.entries(flatConfig).filter(([key]) => !highPriorityParams.includes(key)) : []

    return (
        <div className="p-4">
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                    <div className="flex justify-between items-center">
                        <h1 className="text-2xl font-bold">新配置表单</h1>
                         <Button type="submit">保存配置</Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {highPriorityFields.map(([key, param]) => (
                            <div key={key}>
                                {renderInput(key, param, form)}
                            </div>
                        ))}
                    </div>
                    
                    <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value="low-priority">
                            <AccordionTrigger>高级设置</AccordionTrigger>
                            <AccordionContent>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
                                    {lowPriorityFields.map(([key, param]) => (
                                        <div key={key}>
                                            {renderInput(key, param, form)}
                                        </div>
                                    ))}
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                </form>
            </Form>
        </div>
    )
}

export default NewConfigForm