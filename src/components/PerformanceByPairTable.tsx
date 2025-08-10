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

interface PairResult {
  key: string
  trades: number
  profit_mean: number
  profit_sum: number
  profit_total_abs: number
  profit_total: number
  duration_avg: string
  wins: number
  draws: number
  losses: number
}

interface PerformanceByPairTableProps {
  resultsPerPair: PairResult[]
  stakeCurrency: string
}

export const PerformanceByPairTable: React.FC<PerformanceByPairTableProps> = ({ resultsPerPair, stakeCurrency }) => {
  if (!resultsPerPair || resultsPerPair.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>按交易对表现</CardTitle>
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
        <CardTitle>按交易对表现</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>交易对</TableHead>
              <TableHead>交易数</TableHead>
              <TableHead>平均利润率</TableHead>
              <TableHead>总利润</TableHead>
              <TableHead>平均持仓</TableHead>
              <TableHead>胜/平/负</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {resultsPerPair.map((result) => (
              <TableRow key={result.key}>
                <TableCell>{result.key}</TableCell>
                <TableCell>{result.trades}</TableCell>
                <TableCell>{(result.profit_mean * 100).toFixed(2)}%</TableCell>
                <TableCell>{result.profit_total_abs.toFixed(4)} {stakeCurrency}</TableCell>
                <TableCell>{result.duration_avg}</TableCell>
                <TableCell>{result.wins}/{result.draws}/{result.losses}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}