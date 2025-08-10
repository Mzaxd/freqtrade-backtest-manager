import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface MetricProps {
  label: string
  value: string | number | undefined | null
  unit?: string
  className?: string
}

const Metric: React.FC<MetricProps> = ({ label, value, unit, className }) => (
  <div className={className}>
    <p className="text-sm text-gray-600">{label}</p>
    <p className="text-lg font-semibold">
      {value ?? 'N/A'}
      {unit && value != null ? <span className="text-sm font-normal">{unit}</span> : ''}
    </p>
  </div>
)

interface SummaryMetricsCardProps {
  results: any
}

export const SummaryMetricsCard: React.FC<SummaryMetricsCardProps> = ({ results }) => {
  if (!results) {
    return null
  }

  const formatPercent = (value: number | undefined | null) => {
    if (value == null) return null
    return (value * 100).toFixed(2)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>总结性指标</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Metric label="总收益率" value={formatPercent(results.profit_total)} unit="%" />
          <Metric label="绝对收益" value={results.profit_total_abs?.toFixed(8)} unit={` ${results.stake_currency}`} />
          <Metric label="市场变化" value={formatPercent(results.market_change)} unit="%" />
          <Metric label="最大回撤" value={formatPercent(results.max_drawdown)} unit="%" />
          <Metric label="CAGR" value={formatPercent(results.cagr)} unit="%" />
          <Metric label="Sharpe 比率" value={results.sharpe?.toFixed(2)} />
          <Metric label="Sortino 比率" value={results.sortino?.toFixed(2)} />
          <Metric label="Calmar 比率" value={results.calmar?.toFixed(2)} />
          <Metric label="盈利交易数" value={results.wins} />
          <Metric label="亏损交易数" value={results.losses} />
          <Metric label="平局交易数" value={results.draws} />
          <Metric label="总交易数" value={results.total_trades} />
          <Metric label="平均持仓时间" value={results.avg_duration} />
          <Metric label="最佳交易对" value={results.best_pair} />
          <Metric label="最差交易对" value={results.worst_pair} />
        </div>
      </CardContent>
    </Card>
  )
}