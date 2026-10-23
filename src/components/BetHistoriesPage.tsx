import { useMemo } from 'react'
import { formatBet, formatMultiplier } from '../data/defaults'
import { formatRoundTime } from '../history/crashHistoryAdapter'
import { useAppState } from '../state/useAppState'
import type { BetHistoryEntry } from '../types'
import './HistoriesPage.css'
import './BetHistoriesPage.css'
import { IconCoins, IconList } from './icons'

function summarizeBetHistory(entries: BetHistoryEntry[]) {
  let wins = 0
  let losses = 0
  let skips = 0
  let totalStaked = 0
  let totalProfit = 0

  for (const entry of entries) {
    if (entry.outcome === 'win') {
      wins += 1
      totalStaked += entry.stake
      totalProfit += entry.profitDelta
    } else if (entry.outcome === 'loss') {
      losses += 1
      totalStaked += entry.stake
      totalProfit += entry.profitDelta
    } else {
      skips += 1
    }
  }

  const bets = wins + losses
  const decisions = entries.length
  const winRate = bets > 0 ? wins / bets : 0
  const betRate = decisions > 0 ? bets / decisions : 0

  return {
    bets,
    wins,
    losses,
    skips,
    decisions,
    winRate,
    betRate,
    totalStaked,
    totalProfit,
  }
}

export function BetHistoriesPage() {
  const { state, clearBetHistory } = useAppState()
  const entries = state.betHistory
  const summary = useMemo(() => summarizeBetHistory(entries), [entries])

  const profitClass =
    summary.totalProfit > 0
      ? 'is-positive'
      : summary.totalProfit < 0
        ? 'is-negative'
        : ''

  return (
    <div className="histories-page bet-histories-page">
      <div className="histories-page__header">
        <div className="histories-page__titles">
          <h2 className="histories-page__title">Bet Histories</h2>
          <p className="histories-page__subtitle">
            Placed wagers and intentional skips (with reason)
          </p>
        </div>
        {entries.length > 0 ? (
          <button
            type="button"
            className="btn btn-ghost bet-histories-page__clear"
            onClick={clearBetHistory}
          >
            Clear
          </button>
        ) : null}
      </div>

      {entries.length > 0 ? (
        <section className="bet-summary" aria-label="Bet history summary">
          <div className="bet-summary__cell">
            <span className="bet-summary__label">Bets</span>
            <span className="bet-summary__value">{summary.bets}</span>
          </div>
          <div className="bet-summary__cell">
            <span className="bet-summary__label">W / L</span>
            <span className="bet-summary__value">
              {summary.wins}/{summary.losses}
            </span>
          </div>
          <div className="bet-summary__cell">
            <span className="bet-summary__label">Skips</span>
            <span className="bet-summary__value">{summary.skips}</span>
          </div>
          <div className="bet-summary__cell">
            <span className="bet-summary__label">Win rate</span>
            <span className="bet-summary__value">
              {summary.bets === 0
                ? '—'
                : `${(summary.winRate * 100).toFixed(1)}%`}
            </span>
          </div>
          <div className="bet-summary__cell">
            <span className="bet-summary__label">Bet rate</span>
            <span className="bet-summary__value">
              {summary.decisions === 0
                ? '—'
                : `${(summary.betRate * 100).toFixed(0)}%`}
            </span>
          </div>
          <div className="bet-summary__cell">
            <span className="bet-summary__label">P/L</span>
            <span className={`bet-summary__value ${profitClass}`}>
              {summary.totalProfit > 0 ? '+' : ''}
              {formatBet(summary.totalProfit)}
            </span>
          </div>
        </section>
      ) : null}

      <section className="history-table" aria-label="Bet history">
        <div className="history-table__head bet-history-table__head">
          <span>Round</span>
          <span>Stake</span>
          <span>Result</span>
          <span>Time</span>
        </div>

        <div className="history-table__body">
          {entries.length === 0 ? (
            <p className="history-table__empty">
              No decisions yet. Start Auto Bet — placed bets and skips (e.g. signal
              off) show up here.
            </p>
          ) : (
            entries.map((entry) => {
              const isSkip = entry.outcome === 'skip'
              const won = entry.outcome === 'win'
              return (
                <div key={entry.id} className="history-row bet-history-row">
                  <div className="bet-history-row__round">
                    <span className="history-row__id">#{entry.roundId}</span>
                    <span className="bet-history-row__strategy">
                      {entry.strategyName}
                    </span>
                  </div>
                  <div className="bet-history-row__stake">
                    {isSkip ? (
                      <span className="bet-history-row__muted">—</span>
                    ) : (
                      <>
                        <span>{formatBet(entry.stake)}</span>
                        <span className="bet-history-row__target">
                          @ {formatMultiplier(entry.target)}
                        </span>
                      </>
                    )}
                  </div>
                  <div className="bet-history-row__result">
                    <span
                      className={`bet-outcome-pill ${
                        isSkip ? 'is-skip' : won ? 'is-win' : 'is-loss'
                      }`}
                    >
                      {isSkip ? 'SKIP' : won ? 'WIN' : 'LOSS'}
                    </span>
                    {isSkip ? (
                      <span
                        className="bet-history-row__reason"
                        title={entry.reason}
                      >
                        {entry.reason}
                      </span>
                    ) : (
                      <>
                        <span className="bet-history-row__crash">
                          crash{' '}
                          {entry.crash != null
                            ? formatMultiplier(entry.crash)
                            : '—'}
                        </span>
                        <span
                          className={`bet-history-row__pnl ${
                            entry.profitDelta > 0
                              ? 'is-positive'
                              : entry.profitDelta < 0
                                ? 'is-negative'
                                : ''
                          }`}
                        >
                          {entry.profitDelta > 0 ? '+' : ''}
                          {formatBet(entry.profitDelta)}
                        </span>
                      </>
                    )}
                  </div>
                  <span className="history-row__time">
                    {formatRoundTime(entry.placedAt)}
                  </span>
                </div>
              )
            })
          )}
        </div>

        <div className="history-table__footer">
          <span className="history-table__footer-live">
            <IconCoins size={11} />
            {summary.bets} bet{summary.bets === 1 ? '' : 's'} · {summary.skips}{' '}
            skip{summary.skips === 1 ? '' : 's'}
          </span>
          <span>
            <IconList size={11} /> Signal skips included
          </span>
        </div>
      </section>
    </div>
  )
}
