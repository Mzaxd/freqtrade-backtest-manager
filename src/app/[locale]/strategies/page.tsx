'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Upload, Trash2, Edit, Plus, Zap, Download, Rocket } from 'lucide-react'
import { format } from 'date-fns'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'

async function getStrategies() {
  const response = await fetch('/api/strategies')
  if (!response.ok) throw new Error('Failed to fetch strategies')
  const result = await response.json()
  return result.data ?? []
}

async function getImportableStrategies() {
  const response = await fetch('/api/strategies/import')
  if (!response.ok) throw new Error('Failed to fetch importable strategies')
  const result = await response.json()
  return result.data?.files ?? []
}

async function importStrategies(filenames: string[]) {
  const response = await fetch('/api/strategies/import', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ filenames }),
  })
  if (!response.ok) throw new Error('Failed to import strategies')
  return response.json()
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
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
  const [selectedStrategy, setSelectedStrategy] = useState<any>(null)
  const [selectedFiles, setSelectedFiles] = useState<string[]>([])

  const { data: strategies, isLoading } = useQuery({
    queryKey: ['strategies'],
    queryFn: getStrategies,
  })

  const { data: importableFiles, isLoading: isLoadingImportable } = useQuery({
    queryKey: ['importable-strategies'],
    queryFn: getImportableStrategies,
    enabled: isImportDialogOpen,
  })

  const { mutate: performDelete, isPending: isDeleting, error } = useMutation({
    mutationFn: deleteStrategy,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['strategies'] })
      setIsDeleteDialogOpen(false)
      setSelectedStrategy(null)
    },
  })

  const { mutate: performImport, isPending: isImporting } = useMutation({
    mutationFn: importStrategies,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['strategies'] })
      queryClient.invalidateQueries({ queryKey: ['importable-strategies'] })
      setIsImportDialogOpen(false)
      setSelectedFiles([])
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

  const handleFileSelection = (filename: string, checked: boolean) => {
    if (checked) {
      setSelectedFiles(prev => [...prev, filename])
    } else {
      setSelectedFiles(prev => prev.filter(f => f !== filename))
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedFiles(importableFiles?.map((f: { filename: string }) => f.filename) || [])
    } else {
      setSelectedFiles([])
    }
  }

  const handleImport = () => {
    if (selectedFiles.length > 0) {
      performImport(selectedFiles)
    }
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
          <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Download className="w-4 h-4 mr-2" />
                {t('importStrategy')}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{t('importStrategy')}</DialogTitle>
                <DialogDescription>
                  {t('importStrategyDescription')}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="select-all"
                      checked={selectedFiles.length === (importableFiles?.length || 0)}
                      onCheckedChange={handleSelectAll}
                    />
                    <label htmlFor="select-all" className="text-sm font-medium">
                      {t('selectAll')} ({selectedFiles.length}/{importableFiles?.length || 0})
                    </label>
                  </div>
                  <Badge variant="secondary">
                    {t('filesAvailable', { count: importableFiles?.length || 0 })}
                  </Badge>
                </div>
                
                {isLoadingImportable ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto border rounded-md">
                    {importableFiles?.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        {t('noStrategyFilesFound')}
                      </div>
                    ) : (
                      importableFiles?.map((file: { filename: string, className: string, size: number, lastModified: string }) => (
                        <div key={file.filename} className="flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-md">
                          <Checkbox
                            id={`file-${file.filename}`}
                            checked={selectedFiles.includes(file.filename)}
                            onCheckedChange={(checked) => handleFileSelection(file.filename, checked as boolean)}
                          />
                          <div className="flex-1 min-w-0">
                            <label htmlFor={`file-${file.filename}`} className="text-sm font-medium cursor-pointer">
                              {file.filename}
                            </label>
                            <div className="text-xs text-muted-foreground">
                              {file.className && <span className="mr-2">{t('className')}: {file.className}</span>}
                              <span>{t('sizeLabel')}: {(file.size / 1024).toFixed(1)} KB</span>
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(file.lastModified).toLocaleDateString()}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsImportDialogOpen(false)}>
                  {t('cancel')}
                </Button>
                <Button 
                  onClick={handleImport} 
                  disabled={selectedFiles.length === 0 || isImporting}
                >
                  {isImporting ? t('importing') : t('importFiles', { count: selectedFiles.length })}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {strategies?.map((strategy: { id: number; className: string; filename: string; description: string; createdAt: string; _count: { backtestTasks: number; hyperoptTasks: number; }; }) => (
          <Link
            href={`/strategies/${strategy.id}`}
            key={strategy.id}
            className="block hover:shadow-lg transition-shadow duration-200 rounded-lg"
          >
            <Card className="h-full flex flex-col">
              <CardHeader>
                <CardTitle className="text-lg flex justify-between items-center">
                  <span className="truncate">{strategy.className}</span>
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        e.preventDefault()
                        setSelectedStrategy(strategy)
                        setIsEditDialogOpen(true)
                      }}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <AlertDialog
                      open={isDeleteDialogOpen && selectedStrategy?.id === strategy.id}
                      onOpenChange={(open) => {
                        if (!open) {
                          setSelectedStrategy(null)
                          setIsDeleteDialogOpen(false)
                        }
                      }}
                    >
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            e.preventDefault()
                            setSelectedStrategy(strategy)
                            setIsDeleteDialogOpen(true)
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent
                        onClick={(e) => {
                          e.stopPropagation()
                          e.preventDefault()
                        }}
                      >
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            {t('deleteDialog.title')}
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            {t('deleteDialog.description', {
                              strategyName: selectedStrategy?.className,
                            })}
                            {error && (
                              <p className="text-red-500 mt-2">
                                {t('deleteDialog.error', {
                                  error: (error as Error).message,
                                })}
                              </p>
                            )}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>
                            {t('deleteDialog.cancel')}
                          </AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => performDelete(selectedStrategy.id)}
                            className="bg-red-500 hover:bg-red-600"
                            disabled={isDeleting}
                          >
                            {isDeleting
                              ? t('deleteDialog.deleting')
                              : t('deleteDialog.delete')}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-grow flex flex-col justify-between">
                <div className="space-y-2 mb-4">
                  <div>
                    <span className="text-sm text-muted-foreground">
                      {t('filename')}:
                    </span>
                    <span className="text-sm ml-1">{strategy.filename}</span>
                  </div>
                  {strategy.description && (
                    <div>
                      <span className="text-sm text-muted-foreground">
                        {t('description')}:
                      </span>
                      <span className="text-sm ml-1">
                        {strategy.description}
                      </span>
                    </div>
                  )}
                  <div>
                    <span className="text-sm text-muted-foreground">
                      {t('createdAt')}:
                    </span>
                    <span className="text-sm ml-1">
                      {format(new Date(strategy.createdAt), 'PP')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {t('backtests')}:
                    </span>
                    <span className="text-sm font-medium">
                      {t('taskCount', {
                        count: strategy._count?.backtestTasks || 0,
                      })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {t('hyperopts')}:
                    </span>
                    <span className="text-sm font-medium">
                      {t('taskCount', {
                        count: strategy._count?.hyperoptTasks || 0,
                      })}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      e.preventDefault()
                      router.push(`/backtests/new?strategyId=${strategy.id}`)
                    }}
                  >
                    <Rocket className="w-4 h-4 mr-2" />
                    {t('newBacktest')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      e.preventDefault()
                      router.push(`/hyperopts/new?strategyId=${strategy.id}`)
                    }}
                  >
                    <Zap className="w-4 h-4 mr-2" />
                    {t('newHyperopt')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </Link>
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
