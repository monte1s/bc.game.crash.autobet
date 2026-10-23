import type { DemoStats } from '../types'
import { formatBet, formatMultiplier } from '../data/defaults'
import './StatisticsSummary.css'
import { IconCoins, IconPiggy, IconWallet } from './icons'

interface StatisticsSummaryProps {
  stats: DemoStats
  onOpenBetHistory?: () => void
}

export function StatisticsSummary({
  stats,
  onOpenBetHistory,
}: StatisticsSummaryProps) {
  const profitClass =
    stats.totalProfit > 0
      ? 'is-positive'
      : stats.totalProfit < 0
        ? 'is-negative'
        : 'is-neutral'

  const resolved = stats.wins + stats.losses
  const winRateLabel =
    resolved === 0 ? '—' : `${(stats.winRate * 100).toFixed(1)}%`

  const lastLabel = (() => {
    if (!stats.lastOutcome) return '—'
    if (stats.lastOutcome === 'skip') {
      return stats.lastDecisionReason
        ? `Skip · ${stats.lastDecisionReason}`
        : 'Skip'
    }
    const crash =
      stats.lastCrash != null ? formatMultiplier(stats.lastCrash) : '?'
    const target =
      stats.lastTarget != null ? formatMultiplier(stats.lastTarget) : '?'
    return `${stats.lastOutcome === 'win' ? 'W' : 'L'} ${crash} / ${target}`
  })()

  return (
    <div>
      <div className="stats-summary" aria-label="Simulation statistics">
        <div className="stats-summary__cell">
          <p className="stats-summary__label">
            <IconWallet size={12} />
            P/L
          </p>
          <p className={`stats-summary__value ${profitClass}`}>
            {formatBet(stats.totalProfit)}
          </p>
        </div>
        <button
          type="button"
          className="stats-summary__cell stats-summary__cell--button"
          onClick={onOpenBetHistory}
          title="Open bet histories"
          aria-label={`Open bet histories, ${stats.totalBets} bets`}
        >
          <p className="stats-summary__label">
            <IconCoins size={12} />
            Bets
          </p>
          <p className="stats-summary__value">{stats.totalBets}</p>
        </button>
        <div className="stats-summary__cell">
          <p className="stats-summary__label">
            <IconPiggy size={12} />
            W / L
          </p>
          <p className="stats-summary__value">
            {stats.wins}/{stats.losses}
          </p>
        </div>
      </div>

      <div
        className="stats-summary stats-summary--secondary"
        aria-label="Result detail"
      >
        <div className="stats-summary__cell">
          <p className="stats-summary__label">Win rate</p>
          <p className="stats-summary__value">{winRateLabel}</p>
        </div>
        <div className="stats-summary__cell stats-summary__cell--wide">
          <p className="stats-summary__label">
            Last
            {stats.skips > 0 ? ` · ${stats.skips} skips` : ''}
          </p>
          <p
            className={`stats-summary__value stats-summary__value--wrap ${
              stats.lastOutcome === 'skip' ? 'is-skip' : ''
            }`}
            title={stats.lastDecisionReason ?? lastLabel}
          >
            {lastLabel}
          </p>
        </div>
      </div>

      {stats.lastOutcome === 'skip' && stats.lastDecisionReason ? (
        <p className="stats-summary__skip-reason" role="status">
          Skipping: {stats.lastDecisionReason}
        </p>
      ) : null}

      <p className="stats-summary__caption">
        Signal 1.3x skips unless ≥2 of last 10 crashes are under 1.3 · tap Bets
        for log
      </p>
    </div>
  )
}
