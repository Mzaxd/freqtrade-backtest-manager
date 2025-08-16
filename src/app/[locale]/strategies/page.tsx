'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Upload, Trash2, Edit, Plus, Zap } from 'lucide-react'
import { format } from 'date-fns'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import StrategyEditor from '@/components/strategy-editor'
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
} from '@/components/ui/alert-dialog'

async function getStrategies() {
  const response = await fetch('/api/strategies')
  if (!response.ok) throw new Error('Failed to fetch strategies')
  const result = await response.json()
  return result.data ?? []
}

async function deleteStrategy(id: number): Promise<any> {
  const response = await fetch(`/api/strategies/${id}`, {
    method: 'DELETE',
  })
  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.error || 'Failed to delete strategy')
  }
  return response.json()
}

export default function StrategiesPage() {
  const t = useTranslations('StrategyManagement')
  const router = useRouter()
  const queryClient = useQueryClient()
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [selectedStrategy, setSelectedStrategy] = useState<any>(null)

  const { data: strategies, isLoading } = useQuery({
    queryKey: ['strategies'],
    queryFn: getStrategies,
  })

  const { mutate: performDelete, isPending: isDeleting, error } = useMutation({
    mutationFn: deleteStrategy,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['strategies'] })
      setIsDeleteDialogOpen(false)
      setSelectedStrategy(null)
    },
  })

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch('/api/strategies', {
        method: 'POST',
        body: formData,
      })
      if (response.ok) {
        queryClient.invalidateQueries({ queryKey: ['strategies'] })
      }
    } catch (uploadError) {
      console.error('Failed to upload strategy:', uploadError)
    }
  }

  const handleSaveStrategy = async (content: string) => {
    const response = await fetch(`/api/strategies/${selectedStrategy.id}/content`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content }),
    })
    
    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to save strategy')
    }
    
    queryClient.invalidateQueries({ queryKey: ['strategies'] })
  }

  const handleCreateStrategy = async (filename: string, content: string) => {
    const formData = new FormData()
    const blob = new Blob([content], { type: 'text/plain' })
    const file = new File([blob], filename, { type: 'text/plain' })
    formData.append('file', file)
    
    const response = await fetch('/api/strategies', {
      method: 'POST',
      body: formData,
    })
    
    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to create strategy')
    }
    
    queryClient.invalidateQueries({ queryKey: ['strategies'] })
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">{t('title')}</h1>
        <div className="animate-pulse">
          <Card>
            <CardContent className="p-6">
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">{t('title')}</h1>
        <div className="flex gap-2">
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            {t('createStrategy')}
          </Button>
          <Button asChild>
            <label className="cursor-pointer">
              <Upload className="w-4 h-4 mr-2" />
              {t('uploadStrategy')}
              <input
                type="file"
                accept=".py"
                className="hidden"
                onChange={handleFileUpload}
              />
            </label>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {strategies?.map((strategy: any) => (
          <Card key={strategy.id}>
            <CardHeader>
              <CardTitle className="text-lg flex justify-between items-center">
                {strategy.className}
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                    onClick={() => {
                      setSelectedStrategy(strategy)
                      setIsEditDialogOpen(true)
                    }}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <AlertDialog open={isDeleteDialogOpen && selectedStrategy?.id === strategy.id} onOpenChange={(open) => {
                    if (!open) {
                      setSelectedStrategy(null)
                      setIsDeleteDialogOpen(false)
                    }
                  }}>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => {
                          setSelectedStrategy(strategy)
                          setIsDeleteDialogOpen(true)
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{t('deleteDialog.title')}</AlertDialogTitle>
                      <AlertDialogDescription>
                        {t('deleteDialog.description', { strategyName: selectedStrategy?.className })}
                        {error && <p className="text-red-500 mt-2">{t('deleteDialog.error', { error: (error as Error).message })}</p>}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{t('deleteDialog.cancel')}</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => performDelete(selectedStrategy.id)}
                        className="bg-red-500 hover:bg-red-600"
                        disabled={isDeleting}
                      >
                        {isDeleting ? t('deleteDialog.deleting') : t('deleteDialog.delete')}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div>
                  <span className="text-sm text-muted-foreground">{t('filename')}:</span>
                  <span className="text-sm">{strategy.filename}</span>
                </div>
                {strategy.description && (
                  <div>
                    <span className="text-sm text-muted-foreground">{t('description')}:</span>
                    <span className="text-sm">{strategy.description}</span>
                  </div>
                )}
                <div>
                  <span className="text-sm text-muted-foreground">{t('createdAt')}:</span>
                  <span className="text-sm">
                    {format(new Date(strategy.createdAt), 'PP')}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Hyperopt:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {t('hyperoptCount', { count: strategy._count?.hyperoptTasks || 0 })}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                      onClick={() => router.push(`/hyperopts?strategy=${strategy.id}`)}
                    >
                      <Zap className="w-4 h-4 mr-1" />
                      {t('view')}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <StrategyEditor
        strategy={selectedStrategy}
        isOpen={isEditDialogOpen}
        onClose={() => {
          setIsEditDialogOpen(false)
          setSelectedStrategy(null)
        }}
        onSave={handleSaveStrategy}
      />
      <StrategyEditor
        strategy={null}
        isOpen={isCreateDialogOpen}
        mode="create"
        onClose={() => {
          setIsCreateDialogOpen(false)
        }}
        onSave={handleSaveStrategy}
        onCreate={handleCreateStrategy}
      />
    </div>
  )
}
