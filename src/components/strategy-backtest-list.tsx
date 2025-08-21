'use client'

import { useQuery } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'

async function getBacktests(strategyId: string) {
  const response = await fetch(`/api/backtests?strategyId=${strategyId}`)
  if (!response.ok) {
    throw new Error('Failed to fetch backtests for strategy')
  }
  return response.json()
}

interface StrategyBacktestListProps {
  strategyId: string
}

export default function StrategyBacktestList({ strategyId }: StrategyBacktestListProps) {
  const t = useTranslations('BacktestHistory')
  const router = useRouter()

  const { data: backtests, isLoading } = useQuery({
    queryKey: ['backtests', strategyId],
    queryFn: () => getBacktests(strategyId),
    enabled: !!strategyId,
  })

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800'
      case 'FAILED':
        return 'bg-red-100 text-red-800'
      case 'RUNNING':
        return 'bg-blue-100 text-blue-800'
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (isLoading) {
    return <div>{t('loading')}</div>
  }

  if (!backtests || backtests.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">{t('backtestContentPlaceholder')}</div>
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t('taskName')}</TableHead>
          <TableHead>{t('status')}</TableHead>
          <TableHead>{t('createdAt')}</TableHead>
          <TableHead>{t('completedAt')}</TableHead>
          <TableHead></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {backtests.map((backtest: any) => (
          <TableRow key={backtest.id}>
            <TableCell className="font-medium">{backtest.name}</TableCell>
            <TableCell>
              <Badge className={getStatusColor(backtest.status)}>
                {backtest.status}
              </Badge>
            </TableCell>
            <TableCell>{format(new Date(backtest.createdAt), 'Pp')}</TableCell>
            <TableCell>
              {backtest.completedAt ? format(new Date(backtest.completedAt), 'Pp') : 'N/A'}
            </TableCell>
            <TableCell className="text-right">
              <Button variant="outline" size="sm" onClick={() => router.push(`/backtests/${backtest.id}`)}>
                {t('viewDetails')}
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}