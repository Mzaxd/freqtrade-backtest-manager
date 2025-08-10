'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface DailyProfit {
  date: string
  trade_count: number
  absolute_profit: number
  fiat_value: number
  relative_profit: number
}

interface EquityCurveChartProps {
  dailyProfit: DailyProfit[]
  stakeCurrency: string
}

export const EquityCurveChart: React.FC<EquityCurveChartProps> = ({ dailyProfit, stakeCurrency }) => {
  if (!dailyProfit || dailyProfit.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>每日权益曲线</CardTitle>
        </CardHeader>
        <CardContent>
          <p>没有足够的每日收益数据来生成图表。</p>
        </CardContent>
      </Card>
    )
  }

  const chartData = dailyProfit.map((d, index) => ({
    ...d,
    date: new Date(d.date).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }),
    equity: dailyProfit.slice(0, index + 1).reduce((acc, curr) => acc + curr.absolute_profit, 0),
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>每日权益曲线</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis 
              tickFormatter={(value) => `${value.toFixed(4)} ${stakeCurrency}`}
              width={100}
            />
            <Tooltip
              formatter={(value: number, name: string) => {
                if (name === 'Equity') {
                  return [`${value.toFixed(8)} ${stakeCurrency}`, '权益']
                }
                return [value, name]
              }}
              labelFormatter={(label) => `日期: ${label}`}
            />
            <Legend formatter={(value) => '权益'} />
            <Line type="monotone" dataKey="equity" stroke="#8884d8" name="Equity" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}