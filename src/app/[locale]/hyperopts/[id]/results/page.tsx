'use client'

import { useQuery } from '@tanstack/react-query'
import { useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { format } from 'date-fns'

async function getHyperoptResults(id: string) {
  const response = await fetch(`/api/hyperopts/${id}/results`)
  if (!response.ok) {
    throw new Error('Failed to fetch hyperopt results')
  }
  return response.json()
}

export default function HyperoptResultsPage() {
  const t = useTranslations('HyperoptResults')
  const params = useParams()
  const id = params?.id as string

  const { data, isLoading, error } = useQuery({
    queryKey: ['hyperoptResults', id],
    queryFn: () => id ? getHyperoptResults(id) : Promise.reject(new Error('No ID provided')),
    enabled: !!id
  })

  if (!id) {
    return (
      <div className="container mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-lg font-medium text-red-800">{t('error')}</h3>
          <p className="mt-2 text-sm text-red-700">{t('missingId')}</p>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-lg font-medium text-red-800">{t('loadError.title')}</h3>
          <p className="mt-2 text-sm text-red-700">{(error as Error)?.message}</p>
        </div>
      </div>
    )
  }
  
  if (!data || !data.results || data.results.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-4">{t('title')}</h1>
        <p>{t('noResults')}</p>
      </div>
    )
  }

  const { results, best_epoch } = data;
  const columns = results[0] && results[0].params ? Object.keys(results[0].params) : [];

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-4">{t('title')}</h1>
      <Card>
        <CardHeader>
          <CardTitle>{t('summary')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p>{t('totalEpochs', { count: results.length })}</p>
          {best_epoch && <p>{t('bestEpoch', { epoch: best_epoch.epoch, loss: best_epoch.loss.toFixed(6) })}</p>}
        </CardContent>
      </Card>
      
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>{t('detailedResults')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Epoch</TableHead>
                  <TableHead>Loss</TableHead>
                  {columns.map(col => <TableHead key={col}>{col}</TableHead>)}
                  <TableHead>Start Time</TableHead>
                  <TableHead>End Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((row: any, index: number) => (
                  <TableRow key={index} className={best_epoch && row.epoch === best_epoch.epoch ? 'bg-green-50' : ''}>
                    <TableCell>{row.epoch}</TableCell>
                    <TableCell>{row.loss.toFixed(6)}</TableCell>
                    {columns.map(col => <TableCell key={col}>{row.params[col]}</TableCell>)}
                    <TableCell>{format(new Date(row.start_time), 'PPpp')}</TableCell>
                    <TableCell>{format(new Date(row.end_time), 'PPpp')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}