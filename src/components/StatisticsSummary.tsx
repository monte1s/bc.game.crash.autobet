import type { DemoStats } from '../types'
import { formatBet } from '../data/defaults'
import './StatisticsSummary.css'
import { IconCoins, IconPiggy, IconWallet } from './icons'

interface StatisticsSummaryProps {
  stats: DemoStats
}

export function StatisticsSummary({ stats }: StatisticsSummaryProps) {
  const profitClass =
    stats.totalProfit > 0
      ? 'is-positive'
      : stats.totalProfit < 0
        ? 'is-negative'
        : 'is-neutral'

  return (
    <div>
      <div className="stats-summary" aria-label="Demo statistics">
        <div className="stats-summary__cell">
          <p className="stats-summary__label">
            <IconWallet size={12} />
            Balance
          </p>
          <p className="stats-summary__value">{formatBet(stats.balance)}</p>
        </div>
        <div className="stats-summary__cell">
          <p className="stats-summary__label">
            <IconCoins size={12} />
            Total Bets
          </p>
          <p className="stats-summary__value">{stats.totalBets}</p>
        </div>
        <div className="stats-summary__cell">
          <p className="stats-summary__label">
            <IconPiggy size={12} />
            Total Profit
          </p>
          <p className={`stats-summary__value ${profitClass}`}>
            {formatBet(stats.totalProfit)}
          </p>
        </div>
      </div>
      <p className="stats-summary__caption">Demo data — not live account values</p>
    </div>
  )
}
