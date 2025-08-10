'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { PlusCircle, Edit, Trash2, AlertTriangle, Loader2 } from 'lucide-react'
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

export default function ConfigsPage() {
  const t = useTranslations('ConfigManagement')
  const queryClient = useQueryClient()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedConfig, setSelectedConfig] = useState<ConfigListItem | null>(null)

  const { data: configs, isLoading, isError, error: queryError } = useQuery<ConfigListItem[]>({
    queryKey: ['configs'],
    queryFn: fetchConfigs,
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

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">{t('title')}</h1>
        <Button asChild>
          <Link href="/configs/new">
            <PlusCircle className="mr-2 h-4 w-4" />
            {t('newConfig')}
          </Link>
        </Button>
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
