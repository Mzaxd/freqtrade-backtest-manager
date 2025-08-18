'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { PlusCircle, Edit, Trash2, AlertTriangle, Loader2, Download } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { useState } from 'react'
import toast from 'react-hot-toast'
import { useTranslations } from 'next-intl'
import { format } from 'date-fns'

interface ConfigListItem {
  id: number
  name: string
  description: string | null
  createdAt: string
  updatedAt: string
}

const fetchConfigs = async (): Promise<ConfigListItem[]> => {
  const response = await fetch('/api/configs')
  if (!response.ok) {
    throw new Error('Network response was not ok')
  }
  const result = await response.json()
  return result.data
}

const deleteConfig = async (id: number): Promise<void> => {
  const response = await fetch(`/api/configs/${id}`, {
    method: 'DELETE',
  })
  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.error || 'Failed to delete config')
  }
}

async function getImportableConfigs() {
  const response = await fetch('/api/configs/import')
  if (!response.ok) throw new Error('Failed to fetch importable configs')
  const result = await response.json()
  return result.data?.files ?? []
}

async function importConfigs(filenames: string[]) {
  const response = await fetch('/api/configs/import', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ filenames }),
  })
  if (!response.ok) throw new Error('Failed to import configs')
  return response.json()
}

export default function ConfigsPage() {
  const t = useTranslations('ConfigManagement')
  const queryClient = useQueryClient()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
  const [selectedConfig, setSelectedConfig] = useState<ConfigListItem | null>(null)
  const [selectedFiles, setSelectedFiles] = useState<string[]>([])

  const { data: configs, isLoading, isError, error: queryError } = useQuery<ConfigListItem[]>({
    queryKey: ['configs'],
    queryFn: fetchConfigs,
  })

  const { data: importableFiles, isLoading: isLoadingImportable } = useQuery({
    queryKey: ['importable-configs'],
    queryFn: getImportableConfigs,
    enabled: isImportDialogOpen,
  })

  const { mutate: deleteMutate, isPending: isDeleting, error: deleteError, reset } = useMutation({
    mutationFn: deleteConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['configs'] })
      setIsDialogOpen(false)
      setSelectedConfig(null)
    },
    onError: (error: Error) => {
      toast.error(`${t('deleteFailed')}: ${error.message}`)
    }
  })

  const { mutate: performImport, isPending: isImporting } = useMutation({
    mutationFn: importConfigs,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['configs'] })
      queryClient.invalidateQueries({ queryKey: ['importable-configs'] })
      setIsImportDialogOpen(false)
      setSelectedFiles([])
      toast.success(t('importSuccess'))
    },
    onError: (error: Error) => {
      toast.error(t('importFailed', { error: error.message }))
    }
  })

  const handleOpenDialog = (config: ConfigListItem) => {
    setSelectedConfig(config)
    setIsDialogOpen(true)
    reset() // Reset error state
  }

  const handleDelete = () => {
    if (selectedConfig) {
      deleteMutate(selectedConfig.id)
    }
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
      setSelectedFiles(importableFiles?.map((f: any) => f.filename) || [])
    } else {
      setSelectedFiles([])
    }
  }

  const handleImport = () => {
    if (selectedFiles.length > 0) {
      performImport(selectedFiles)
    }
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">{t('title')}</h1>
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/configs/new">
              <PlusCircle className="mr-2 h-4 w-4" />
              {t('newConfig')}
            </Link>
          </Button>
          <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Download className="w-4 h-4 mr-2" />
                {t('importConfig')}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{t('importConfig')}</DialogTitle>
                <DialogDescription>
                  {t('importConfigDescription')}
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
                        {t('noConfigFilesFound')}
                      </div>
                    ) : (
                      importableFiles?.map((file: any) => (
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
                              {file.name && <span className="mr-2">{t('configNameLabel')}: {file.name}</span>}
                              {file.timeframe && <span className="mr-2">{t('timeframeLabel')}: {file.timeframe}</span>}
                              {file.exchange && <span className="mr-2">{t('exchangeLabel')}: {file.exchange}</span>}
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

      {isLoading && (
        <div className="flex justify-center items-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="ml-4 text-muted-foreground">{t('loading')}</p>
        </div>
      )}

      {isError && (
        <div className="text-destructive bg-destructive/10 p-4 rounded-md flex items-center">
           <AlertTriangle className="h-5 w-5 mr-3" />
           <div>
            <p className="font-semibold">{t('loadFailed')}</p>
            <p className="text-sm">{queryError?.message || t('loadFailedMessage')}</p>
           </div>
        </div>
      )}

      {configs && !configs.length && !isLoading && (
         <div className="text-center py-12 border-2 border-dashed rounded-lg">
            <h3 className="text-xl font-medium">{t('noConfigs.title')}</h3>
            <p className="text-muted-foreground mt-2 mb-6">{t('noConfigs.description')}</p>
            <Button asChild>
                <Link href="/configs/new">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    {t('noConfigs.createButton')}
                </Link>
            </Button>
         </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {configs?.map((config: ConfigListItem) => (
          <Card key={config.id}>
            <CardHeader>
              <CardTitle className="truncate">{config.name}</CardTitle>
              <CardDescription className="truncate h-5">{config.description || t('noDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
               <p>{t('lastUpdated')}: {format(new Date(config.updatedAt), 'PPp')}</p>
                 <div className="flex justify-end space-x-2 mt-4">
                    <Button variant="outline" size="sm" asChild>
                        <Link href={`/configs/${config.id}/edit`}>
                            <Edit className="h-4 w-4" />
                        </Link>
                    </Button>
                    <AlertDialog open={isDialogOpen && selectedConfig?.id === config.id} onOpenChange={setIsDialogOpen}>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" onClick={() => handleOpenDialog(config)}>
                           <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>{t('deleteDialog.title')}</AlertDialogTitle>
                          <AlertDialogDescription>
                            {t('deleteDialog.description', { configName: selectedConfig?.name })}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{t('deleteDialog.cancel')}</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-destructive hover:bg-destructive/90"
                            disabled={isDeleting}
                          >
                           {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : t('deleteDialog.confirm')}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                 </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
