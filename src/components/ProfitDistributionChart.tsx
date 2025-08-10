'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface Trade {
  profit_ratio: number
  // other trade properties...
}

interface ProfitDistributionChartProps {
  trades: Trade[]
}

export const ProfitDistributionChart: React.FC<ProfitDistributionChartProps> = ({ trades }) => {
  if (!trades || trades.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>利润分布直方图</CardTitle>
        </CardHeader>
        <CardContent>
          <p>没有足够的交易数据来生成图表。</p>
        </CardContent>
      </Card>
    )
  }

  const profitRatios = trades.map(t => t.profit_ratio)
  const binSize = 0.01 // 1%
  const bins = new Map<string, number>()

  profitRatios.forEach(ratio => {
    const binStart = Math.floor(ratio / binSize) * binSize
    const binLabel = `${(binStart * 100).toFixed(0)}% to ${(binStart * 100 + 1).toFixed(0)}%`
    bins.set(binLabel, (bins.get(binLabel) || 0) + 1)
  })
  
  const sortedBins = Array.from(bins.entries()).sort((a, b) => {
      return parseFloat(a[0]) - parseFloat(b[0]);
  });

  const chartData = sortedBins.map(([label, count]) => ({
    name: label,
    count: count,
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>利润分布直方图</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
            <YAxis allowDecimals={false} />
            <Tooltip
              formatter={(value: number) => [value, '交易次数']}
              labelFormatter={(label) => `利润区间: ${label}`}
            />
            <Legend formatter={() => '交易次数'} />
            <Bar dataKey="count" fill="#82ca9d" name="Trade Count" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}