import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BacktestTask } from "@prisma/client"

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

interface FullBacktestResult extends BacktestTask {
  resultsSummary: any;
  totalTrades: number | null;
  avgTradeDuration: number | null;
  avgProfit: number | null;
  totalVolume: number | null;
  profitFactor: number | null;
  expectancy: number | null;
  sharpe: number | null;
  sortino: number | null;
  calmar: number | null;
  cagr: number | null;
  maxDrawdown: number | null;
  marketChange: number | null;
}

interface SummaryMetricsCardProps {
  results: BacktestTask & { resultsSummary: any };
}

export const SummaryMetricsCard: React.FC<SummaryMetricsCardProps> = ({ results: initialResults }) => {
  if (!initialResults) {
    return null
  }

  // Use a more specific type assertion to resolve TS errors
  const results = initialResults as FullBacktestResult;
  const { resultsSummary } = results;

  const formatPercent = (value: number | undefined | null) => {
    if (value == null) return 'N/A'
    return (value * 100).toFixed(2)
  }

  const formatDurationFromSeconds = (seconds: number | undefined | null) => {
    if (seconds == null) return 'N/A';
    if (seconds === 0) return '0m';
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    
    const dDisplay = d > 0 ? d + 'd ' : '';
    const hDisplay = h > 0 ? h + 'h ' : '';
    const mDisplay = m > 0 ? m + 'm' : '';
    
    return dDisplay + hDisplay + mDisplay;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>总结性指标</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {/* Key Performance Indicators */}
          <Metric label="绝对收益" value={resultsSummary?.profit_total_abs?.toFixed(3)} unit={` ${resultsSummary?.stake_currency || 'USDT'}`} />
          <Metric label="总收益率" value={formatPercent(resultsSummary?.profit_total)} unit="%" />
          <Metric label="最大回撤" value={formatPercent(results.maxDrawdown)} unit="%" />
          <Metric label="CAGR" value={formatPercent(results.cagr)} unit="%" />
          <Metric label="市场变化" value={formatPercent(results.marketChange)} unit="%" />

          {/* Trade Statistics */}
          <Metric label="总交易数" value={results.totalTrades} />
          <Metric label="胜率" value={formatPercent(resultsSummary?.winrate)} unit="%" />
          <Metric label="盈利因子" value={results.profitFactor?.toFixed(2)} />
          <Metric label="期望收益" value={results.expectancy?.toFixed(3)} />
          <Metric label="平均持仓时间" value={formatDurationFromSeconds(results.avgTradeDuration)} />

          {/* Risk/Reward Ratios */}
          <Metric label="Sharpe 比率" value={results.sharpe?.toFixed(2)} />
          <Metric label="Sortino 比率" value={results.sortino?.toFixed(2)} />
          <Metric label="Calmar 比率" value={results.calmar?.toFixed(2)} />
          <Metric label="总交易量" value={results.totalVolume?.toFixed(2)} unit={` ${resultsSummary?.stake_currency || 'USDT'}`} />

          {/* Pair Performance */}
          <Metric
            label="最佳交易对"
            value={
              resultsSummary?.best_pair?.key
                ? `${resultsSummary.best_pair.key} (${resultsSummary.best_pair.profit_total_abs?.toFixed(2)})`
                : 'N/A'
            }
          />
          <Metric
            label="最差交易对"
            value={
              resultsSummary?.worst_pair?.key
                ? `${resultsSummary.worst_pair.key} (${resultsSummary.worst_pair.profit_total_abs?.toFixed(2)})`
                : 'N/A'
            }
          />
        </div>
      </CardContent>
    </Card>
  )
}