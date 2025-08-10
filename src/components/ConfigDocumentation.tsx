'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { Loader2, Search } from 'lucide-react'

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

const ConfigDocumentation = () => {
  const [params, setParams] = useState<ConfigFile | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchParams = async () => {
      try {
        const res = await fetch('/freqtrade-config-parameters.json')
        if (!res.ok) {
          throw new Error('Failed to fetch config parameters')
        }
        const data: ConfigFile = await res.json()
        setParams(data)
      } catch (error) {
        console.error("Failed to fetch or parse params:", error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchParams()
  }, [])

  const filteredAndGroupedParams = useMemo(() => {
    if (!params) return {}

    const filtered = Object.entries(params).filter(([key, param]) => {
      const lowerSearchTerm = searchTerm.toLowerCase()
      return (
        key.toLowerCase().includes(lowerSearchTerm) ||
        param.description.toLowerCase().includes(lowerSearchTerm) ||
        (categoryTranslations[param.category] || param.category).toLowerCase().includes(lowerSearchTerm)
      )
    })

    return filtered.reduce((acc, [key, value]) => {
      const category = value.category || 'other'
      if (!acc[category]) {
        acc[category] = {}
      }
      acc[category][key] = value
      return acc
    }, {} as Record<string, ConfigFile>)
  }, [params, searchTerm])

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <p className="ml-3 text-muted-foreground">加载文档...</p>
      </div>
    )
  }

  if (!params) {
    return <div className="text-destructive">无法加载配置文档。</div>
  }

  const renderValue = (value: any) => {
    if (typeof value === 'object' && value !== null) {
      return JSON.stringify(value)
    }
    if (typeof value === 'boolean') {
      return value ? 'true' : 'false'
    }
    if (value === null) {
      return 'null'
    }
    return String(value)
  }

  return (
    <div className="flex flex-col h-full border-l bg-card">
      <div className="p-4 border-b">
        <h3 className="text-lg font-semibold mb-2">配置文档</h3>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="搜索参数名称或描述..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>
      <div className="flex-grow overflow-y-auto">
        <Accordion type="multiple" className="w-full" defaultValue={['main', 'exchange', 'risk_management']}>
          {Object.keys(filteredAndGroupedParams).length > 0 ? (
            Object.entries(filteredAndGroupedParams).map(([category, paramsInCategory]) => (
              <AccordionItem value={category} key={category}>
                <AccordionTrigger className="px-4 text-base font-medium capitalize hover:no-underline">
                  {categoryTranslations[category] || category.replace(/_/g, ' ')}
                </AccordionTrigger>
                <AccordionContent>
                  <div className="flex flex-col gap-4 p-4 pt-0">
                    {Object.entries(paramsInCategory).map(([name, param]) => (
                      <div key={name} className="border-t pt-4">
                        <h4 className="font-semibold text-primary">{name}</h4>
                        <p className="text-sm text-muted-foreground mt-1">{param.description}</p>
                        <div className="mt-2 space-y-1 text-xs">
                           <div className="flex items-center">
                                <Badge variant="secondary" className="w-20 text-center justify-center">类型</Badge>
                                <code className="ml-2 text-sm">{param.type}</code>
                           </div>
                           <div className="flex items-center">
                                <Badge variant="outline" className="w-20 text-center justify-center">默认值</Badge>
                                <code className="ml-2 text-sm">{renderValue(param.default)}</code>
                           </div>
                           {param.allowed_values && (
                               <div className="flex items-start">
                                    <Badge variant="outline" className="w-20 text-center justify-center mt-1">可选值</Badge>
                                    <div className="ml-2 flex flex-wrap gap-1">
                                        {param.allowed_values.map((val, i) => <Badge key={i} variant="default">{renderValue(val)}</Badge>)}
                                    </div>
                               </div>
                           )}
                        </div>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))
          ) : (
            <div className="p-6 text-center text-muted-foreground">
              <p>未找到匹配的参数。</p>
            </div>
          )}
        </Accordion>
      </div>
    </div>
  )
}

export default ConfigDocumentation