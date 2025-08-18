'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Rocket, Zap, Code } from 'lucide-react'
import { useRouter } from 'next/navigation'
import StrategyBacktestList from '@/components/strategy-backtest-list'
import StrategyHyperoptList from '@/components/strategy-hyperopt-list'
import StrategyEditor from '@/components/strategy-editor'
import { useState } from 'react'

async function getStrategy(id: string) {
  const response = await fetch(`/api/strategies/${id}`)
  if (!response.ok) {
    throw new Error('Failed to fetch strategy details')
  }
  const result = await response.json()
  return result.data
}

async function getStrategyContent(id: string) {
  const response = await fetch(`/api/strategies/${id}/content`)
  if (!response.ok) {
    throw new Error('Failed to fetch strategy content')
  }
  const result = await response.json()
  return result.data.content
}

export default function StrategyDetailPage() {
  const params = useParams()
  const t = useTranslations('StrategyDetail')
  const router = useRouter()
  const queryClient = useQueryClient()
  const strategyId = params.id as string
  const [isEditorOpen, setIsEditorOpen] = useState(false)

  const { data: strategy, isLoading } = useQuery({
    queryKey: ['strategy', strategyId],
    queryFn: () => getStrategy(strategyId),
    enabled: !!strategyId,
  })

  const { data: strategyContent, isLoading: isLoadingContent } = useQuery({
    queryKey: ['strategyContent', strategyId],
    queryFn: () => getStrategyContent(strategyId),
    enabled: !!strategyId,
  })

  const { mutate: saveContent, isPending: isSaving } = useMutation({
    mutationFn: async (content: string) => {
      const response = await fetch(`/api/strategies/${strategyId}/content`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      if (!response.ok) {
        throw new Error('Failed to save strategy content')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['strategyContent', strategyId] })
      setIsEditorOpen(false)
    },
  })

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-10 bg-gray-200 rounded w-full"></div>
        </div>
      </div>
    )
  }

  if (!strategy) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-2xl font-bold text-red-500">{t('strategyNotFound')}</h1>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">{strategy.className}</h1>
        <div className="flex gap-2">
          <Button onClick={() => router.push(`/backtests/new?strategyId=${strategy.id}`)}>
            <Rocket className="w-4 h-4 mr-2" />
            {t('newBacktest')}
          </Button>
          <Button onClick={() => router.push(`/hyperopts/new?strategyId=${strategy.id}`)}>
            <Zap className="w-4 h-4 mr-2" />
            {t('newHyperopt')}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="backtests" className="w-full">
        <TabsList>
          <TabsTrigger value="backtests">{t('backtests')}</TabsTrigger>
          <TabsTrigger value="hyperopts">{t('hyperopts')}</TabsTrigger>
          <TabsTrigger value="source">{t('sourceCode')}</TabsTrigger>
        </TabsList>
        <TabsContent value="backtests">
          <Card>
            <CardHeader>
              <CardTitle>{t('backtestHistory')}</CardTitle>
            </CardHeader>
            <CardContent>
              <StrategyBacktestList strategyId={strategyId} />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="hyperopts">
          <Card>
            <CardHeader>
              <CardTitle>{t('hyperoptHistory')}</CardTitle>
            </CardHeader>
            <CardContent>
              <StrategyHyperoptList strategyId={strategyId} />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="source">
          <Card>
            <CardHeader>
              <CardTitle>{t('sourceCode')}</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingContent ? (
                <p>{t('loading')}</p>
              ) : (
                <StrategyEditor
                  strategy={{ ...strategy, content: strategyContent }}
                  isOpen={true} // Always open within the tab
                  onClose={() => {}} // No-op as it's embedded
                  onSave={saveContent}
                  mode="edit" // Explicitly in edit mode
                  showModal={false} // Render inline, not as a modal
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}