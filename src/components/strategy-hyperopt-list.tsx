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

async function getHyperopts(strategyId: string) {
  const response = await fetch(`/api/hyperopts?strategyId=${strategyId}`)
  if (!response.ok) {
    throw new Error('Failed to fetch hyperopts for strategy')
  }
  return response.json()
}

interface StrategyHyperoptListProps {
  strategyId: string
}

export default function StrategyHyperoptList({ strategyId }: StrategyHyperoptListProps) {
  const t = useTranslations('HyperoptHistory')
  const router = useRouter()

  const { data: hyperopts, isLoading } = useQuery({
    queryKey: ['hyperopts', strategyId],
    queryFn: () => getHyperopts(strategyId),
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

  if (!hyperopts || hyperopts.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">{t('hyperoptContentPlaceholder')}</div>
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t('epochs')}</TableHead>
          <TableHead>{t('spaces')}</TableHead>
          <TableHead>{t('status')}</TableHead>
          <TableHead>{t('createdAt')}</TableHead>
          <TableHead></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {hyperopts.map((hyperopt: any) => (
          <TableRow key={hyperopt.id}>
            <TableCell>{hyperopt.epochs}</TableCell>
            <TableCell>
              <div className="flex flex-wrap gap-1">
                {hyperopt.spaces.split(',').map((space: string) => (
                  <Badge key={space} variant="secondary">{space}</Badge>
                ))}
              </div>
            </TableCell>
            <TableCell>
              <Badge className={getStatusColor(hyperopt.status)}>
                {hyperopt.status}
              </Badge>
            </TableCell>
            <TableCell>{format(new Date(hyperopt.createdAt), 'Pp')}</TableCell>
            <TableCell className="text-right">
              <Button variant="outline" size="sm" onClick={() => router.push(`/hyperopts/${hyperopt.id}`)}>
                {t('viewDetails')}
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}