'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { Loader2, Search } from 'lucide-react'
import { useTranslations, useLocale } from 'next-intl'

// 定义配置参数的接口
interface Param {
  type: string
  default: any
  description: string
  en_description?: string
  category: string
  allowed_values?: any[]
}

interface ConfigFile {
  [key: string]: Param
}

const ConfigDocumentation = () => {
  const t = useTranslations('ConfigDocumentation');
  const locale = useLocale();
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
        (param.en_description && param.en_description.toLowerCase().includes(lowerSearchTerm)) ||
        (t(`categories.${param.category}`) || param.category).toLowerCase().includes(lowerSearchTerm)
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
        <p className="ml-3 text-muted-foreground">{t('loading')}</p>
      </div>
    )
  }

  if (!params) {
    return <div className="text-destructive">{t('loadFailed')}</div>
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
        <h3 className="text-lg font-semibold mb-2">{t('title')}</h3>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder={t('searchPlaceholder')}
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
                  {t.rich(`categories.${category}`, {
                    // This is a trick to check if the translation exists.
                    // If not, it will fallback to the default render.
                    p: () => category.replace(/_/g, ' ')
                  }) === `categories.${category}` ? category.replace(/_/g, ' ') : t(`categories.${category}`)}
                </AccordionTrigger>
                <AccordionContent>
                  <div className="flex flex-col gap-4 p-4 pt-0">
                    {Object.entries(paramsInCategory).map(([name, param]) => (
                      <div key={name} className="border-t pt-4">
                        <h4 className="font-semibold text-primary">{name}</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          {locale === 'en' ? param.en_description : param.description}
                        </p>
                        <div className="mt-2 space-y-1 text-xs">
                           <div className="flex items-center">
                                <Badge variant="secondary" className="w-20 text-center justify-center">{t('type')}</Badge>
                                <code className="ml-2 text-sm">{param.type}</code>
                           </div>
                           <div className="flex items-center">
                                <Badge variant="outline" className="w-20 text-center justify-center">{t('default')}</Badge>
                                <code className="ml-2 text-sm">{renderValue(param.default)}</code>
                           </div>
                           {param.allowed_values && (
                               <div className="flex items-start">
                                    <Badge variant="outline" className="w-20 text-center justify-center mt-1">{t('allowedValues')}</Badge>
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
              <p>{t('noMatch')}</p>
            </div>
          )}
        </Accordion>
      </div>
    </div>
  )
}

export default ConfigDocumentation