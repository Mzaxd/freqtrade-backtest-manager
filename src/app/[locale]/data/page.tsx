'use client'

import { useState } from 'react'
import { Download } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from "@/components/ui/button"
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
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
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
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'
import RealtimeLogViewer from '@/components/RealtimeLogViewer'

const timeframesOptions = ['1m', '3m', '5m', '15m', '30m', '1h', '2h', '4h', '6h', '8h', '12h', '1d', '3d', '1w'] as const;
const exchanges = ['binance', 'okx', 'gateio', 'kucoin', 'bybit'] as const;

const downloadSchema = z.object({
  exchange: z.enum(exchanges),
  pairs: z.string().min(1, 'Pairs are required'),
  timeframes: z.array(z.enum(timeframesOptions)).min(1, 'At least one timeframe is required'),
  timerangeStart: z.string().optional(),
  timerangeEnd: z.string().optional(),
  format: z.enum(['json', 'feather']),
  marketType: z.enum(['spot', 'futures']),
})

type DownloadFormValues = z.infer<typeof downloadSchema>

async function fetchMarketData(searchTerm: string) {
  const res = await fetch(`/api/data?search=${searchTerm}`)
  if (!res.ok) {
    throw new Error('Failed to fetch market data')
  }
  return res.json()
}

async function getImportableMarketData() {
  const response = await fetch('/api/market-data/import')
  if (!response.ok) throw new Error('Failed to fetch importable market data')
  const result = await response.json()
  return result.data?.files ?? []
}

async function importMarketData(files: any[]) {
  const response = await fetch('/api/market-data/import', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ files }),
  })
  if (!response.ok) throw new Error('Failed to import market data')
  return response.json()
}

export default function DataPage() {
  const queryClient = useQueryClient()
  const t = useTranslations('DataManagement');
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null)
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<any[]>([])

  const { data, isLoading } = useQuery({
    queryKey: ['marketData', searchTerm],
    queryFn: () => fetchMarketData(searchTerm),
  })

  const { data: jobs } = useQuery({
    queryKey: ['downloadJobs'],
    queryFn: async () => {
      const res = await fetch('/api/data/download')
      if (!res.ok) throw new Error('Failed to fetch jobs')
      return res.json()
    },
    refetchInterval: 5000,
  })

  const { data: importableFiles, isLoading: isLoadingImportable } = useQuery({
    queryKey: ['importable-market-data'],
    queryFn: getImportableMarketData,
    enabled: isImportDialogOpen,
  })

  const form = useForm<DownloadFormValues>({
    resolver: zodResolver(downloadSchema),
    defaultValues: {
      exchange: 'binance',
      pairs: 'BTC/USDT,ETH/USDT',
      timeframes: ['5m', '1h'],
      timerangeStart: '',
      timerangeEnd: '',
      format: 'json',
      marketType: 'spot',
    },
  })

  const downloadMutation = useMutation({
    mutationFn: async (values: DownloadFormValues) => {
      const res = await fetch('/api/data/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      if (!res.ok) {
        throw new Error(t('jobFailed'))
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success(t('jobStarted'))
      queryClient.invalidateQueries({ queryKey: ['marketData'] })
      queryClient.invalidateQueries({ queryKey: ['downloadJobs'] })
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/data/${id}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        throw new Error(t('deleteFailed'))
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success(t('deleteSuccess'))
      queryClient.invalidateQueries({ queryKey: ['marketData', searchTerm] })
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const { mutate: performImport, isPending: isImporting } = useMutation({
    mutationFn: importMarketData,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketData'] })
      queryClient.invalidateQueries({ queryKey: ['importable-market-data'] })
      setIsImportDialogOpen(false)
      setSelectedFiles([])
      toast.success(t('importSuccess'))
    },
    onError: (error) => {
      toast.error(t('importFailed', { error: error.message }))
    }
  })

  function onSubmit(values: DownloadFormValues) {
    downloadMutation.mutate(values)
  }

  const handleDelete = (id: number) => {
    deleteMutation.mutate(id)
  }

  const handleFileSelection = (file: any, checked: boolean) => {
    if (checked) {
      setSelectedFiles(prev => [...prev, file])
    } else {
      setSelectedFiles(prev => prev.filter(f => f.filename !== file.filename))
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedFiles(importableFiles || [])
    } else {
      setSelectedFiles([])
    }
  }

  const handleImport = () => {
    if (selectedFiles.length > 0) {
      performImport(selectedFiles)
    }
  }
  
  const mergedData = data?.map((market: any) => {
    const job = jobs?.find((j: any) => 
      j.pairs.includes(market.pair) && 
      j.timeframes.includes(market.timeframe) &&
      j.exchange === market.exchange &&
      // Check if the job is recent enough to be related
      new Date(j.createdAt) > new Date(new Date().getTime() - 24 * 60 * 60 * 1000)
    );
    return { ...market, jobStatus: job?.status, jobId: job?.id, jobLogs: job?.logs };
  }) || [];

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              {t('importData')}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t('importData')}</DialogTitle>
              <DialogDescription>
                {t('importDataDescription')}
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
                      {t('noFilesFound')}
                    </div>
                  ) : (
                    importableFiles?.map((file: any) => (
                      <div key={file.filename} className="flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-md">
                        <Checkbox
                          id={`file-${file.filename}`}
                          checked={selectedFiles.some(f => f.filename === file.filename)}
                          onCheckedChange={(checked) => handleFileSelection(file, checked as boolean)}
                        />
                        <div className="flex-1 min-w-0">
                          <label htmlFor={`file-${file.filename}`} className="text-sm font-medium cursor-pointer">
                            {file.filename}
                          </label>
                          <div className="text-xs text-muted-foreground">
                            <span className="mr-2">{t('exchangeLabel')}: {file.exchange}</span>
                            <span className="mr-2">{t('pairLabel')}: {file.pair}</span>
                            <span className="mr-2">{t('timeframeLabel')}: {file.timeframe}</span>
                            <span className="mr-2">{t('formatLabel')}: {file.format}</span>
                            <span>{t('sizeLabel')}: {(file.size / 1024 / 1024).toFixed(1)} MB</span>
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
      
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>{t('downloadNewData')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <FormField
                  control={form.control}
                  name="exchange"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('exchange')}</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t('selectExchange')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {exchanges.map(ex => <SelectItem key={ex} value={ex}>{ex}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="marketType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('marketType')}</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t('selectMarketType')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="spot">{t('spot')}</SelectItem>
                          <SelectItem value="futures">{t('futures')}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <FormField
                  control={form.control}
                  name="timerangeStart"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('startDateOptional')}</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="timerangeEnd"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('endDateOptional')}</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="pairs"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('pairs')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('pairsPlaceholder')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="timeframes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('timeframes')}</FormLabel>
                    <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
                      {timeframesOptions.map((item) => (
                        <FormField
                          key={item}
                          control={form.control}
                          name="timeframes"
                          render={({ field }) => {
                            return (
                              <FormItem
                                key={item}
                                className="flex flex-row items-start space-x-3 space-y-0"
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(item)}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([...field.value, item])
                                        : field.onChange(
                                            field.value?.filter(
                                              (value) => value !== item
                                            )
                                          )
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="font-normal">
                                  {item}
                                </FormLabel>
                              </FormItem>
                            )
                          }}
                        />
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={downloadMutation.isPending}>
                {downloadMutation.isPending ? t('startingJob') : t('downloadData')}
              </Button>
              <FormField
                control={form.control}
                name="format"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('format')}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('selectFormat')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="json">JSON</SelectItem>
                        <SelectItem value="feather">Feather</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('availableMarketData')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-end mb-4">
            <Input
              placeholder={t('searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('exchange')}</TableHead>
                <TableHead>{t('pair')}</TableHead>
                <TableHead>{t('timeframe')}</TableHead>
                <TableHead>{t('startTime')}</TableHead>
                <TableHead>{t('endTime')}</TableHead>
                <TableHead>{t('status')}</TableHead>
                <TableHead>{t('lastUpdated')}</TableHead>
                <TableHead>{t('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center">{t('loading')}</TableCell>
                </TableRow>
              ) : (
                mergedData.map((data: any) => (
                  <TableRow key={data.id}>
                    <TableCell>{data.exchange}</TableCell>
                    <TableCell>{data.pair}</TableCell>
                    <TableCell>{data.timeframe}</TableCell>
                    <TableCell>{data.startTime ? new Date(data.startTime).toLocaleDateString() : 'N/A'}</TableCell>
                    <TableCell>{data.endTime ? new Date(data.endTime).toLocaleDateString() : 'N/A'}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        data.status === 'available' ? 'bg-green-200 text-green-800' :
                        data.jobStatus === 'RUNNING' ? 'bg-blue-200 text-blue-800' :
                        data.jobStatus === 'FAILED' ? 'bg-red-200 text-red-800' :
                        'bg-gray-200 text-gray-800'
                      }`}>
                        {data.status === 'available' ? t('available') : t((data.jobStatus || 'PENDING') as any)}
                      </span>
                    </TableCell>
                    <TableCell>{new Date(data.updatedAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        {data.jobId && (data.jobStatus === 'RUNNING' || data.jobStatus === 'FAILED') && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm" onClick={() => setSelectedJobId(data.jobId)}>{t('viewLogs')}</Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="max-w-4xl">
                              <AlertDialogHeader>
                                <AlertDialogTitle>{t('logsFor')} {data.pair}</AlertDialogTitle>
                              </AlertDialogHeader>
                              {selectedJobId === data.jobId &&
                                <RealtimeLogViewer
                                  logSourceUrl={`/api/data/${selectedJobId}/logs`}
                                  initialLogs={data.jobLogs}
                                />
                              }
                              <AlertDialogFooter>
                                <AlertDialogCancel onClick={() => setSelectedJobId(null)}>{t('close')}</AlertDialogCancel>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm">{t('delete')}</Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>{t('confirmDeletion')}</AlertDialogTitle>
                              <AlertDialogDescription>
                                {t('deleteConfirmationMessage')}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(data.id)}>
                                {t('confirm')}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}