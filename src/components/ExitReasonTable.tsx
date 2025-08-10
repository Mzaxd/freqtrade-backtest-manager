'use client'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface ExitReasonStat {
  reason: string
  trades: number
  profit_mean: number
  profit_sum: number
  profit_total_abs: number
}

interface ExitReasonTableProps {
  exitReasonStats: ExitReasonStat[]
  stakeCurrency: string
}

export const ExitReasonTable: React.FC<ExitReasonTableProps> = ({ exitReasonStats, stakeCurrency }) => {
  if (!exitReasonStats || exitReasonStats.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>按离场原因分析</CardTitle>
        </CardHeader>
        <CardContent>
          <p>没有足够的交易数据来生成表格。</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>按离场原因分析</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>离场原因</TableHead>
              <TableHead>交易数</TableHead>
              <TableHead>平均利润率</TableHead>
              <TableHead>总利润</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Object.entries(exitReasonStats).map(([reason, stats]) => (
              <TableRow key={reason}>
                <TableCell>{reason}</TableCell>
                <TableCell>{stats.trades}</TableCell>
                <TableCell>{(stats.profit_mean * 100).toFixed(2)}%</TableCell>
                <TableCell>{stats.profit_sum.toFixed(4)} {stakeCurrency}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}