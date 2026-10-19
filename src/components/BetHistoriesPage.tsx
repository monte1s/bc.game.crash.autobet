import { formatBet, formatMultiplier } from '../data/defaults'
import { formatRoundTime } from '../history/crashHistoryAdapter'
import { useAppState } from '../state/useAppState'
import './HistoriesPage.css'
import './BetHistoriesPage.css'
import { IconCoins, IconList } from './icons'

export function BetHistoriesPage() {
  const { state, clearBetHistory } = useAppState()
  const entries = state.betHistory
  const bets = entries.filter((e) => e.outcome !== 'skip').length
  const skips = entries.filter((e) => e.outcome === 'skip').length

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
            {bets} bet{bets === 1 ? '' : 's'} · {skips} skip
            {skips === 1 ? '' : 's'}
          </span>
          <span>
            <IconList size={11} /> Signal skips included
          </span>
        </div>
      </section>
    </div>
  )
}
