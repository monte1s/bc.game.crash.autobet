import { useEffect, useRef, useState } from 'react'
import {
  formatMultiplier,
  formatRoundTime,
  getMultiplierTone,
} from '../history/crashHistoryAdapter'
import { useCrashHistory } from '../history/useCrashHistory'
import type { HistoryConnectionStatus } from '../history/types'
import './HistoriesPage.css'
import { IconChevronRight, IconList, IconRefresh } from './icons'

function statusLabel(status: HistoryConnectionStatus): string {
  switch (status) {
    case 'connecting':
      return 'Connecting'
    case 'live':
      return 'Live'
    case 'reconnecting':
      return 'Reconnecting'
    case 'offline':
    default:
      return 'Offline'
  }
}

interface HistoriesPageProps {
  active: boolean
}

export function HistoriesPage({ active }: HistoriesPageProps) {
  const {
    rounds,
    status,
    statusReason,
    newestHighlightIds,
    isRefreshing,
    refresh,
  } = useCrashHistory(active)

  const bodyRef = useRef<HTMLDivElement>(null)
  const [stuckAwayFromTop, setStuckAwayFromTop] = useState(false)
  const [pendingNewCount, setPendingNewCount] = useState(0)
  const previousTopId = useRef<string | null>(null)

  useEffect(() => {
    const topId = rounds[0]?.roundId ?? null
    if (
      previousTopId.current &&
      topId &&
      topId !== previousTopId.current &&
      stuckAwayFromTop
    ) {
      setPendingNewCount((count) => count + 1)
    }
    previousTopId.current = topId
  }, [rounds, stuckAwayFromTop])

  const handleScroll = () => {
    const node = bodyRef.current
    if (!node) return
    const away = node.scrollTop > 24
    setStuckAwayFromTop(away)
    if (!away) {
      setPendingNewCount(0)
    }
  }

  const jumpToLatest = () => {
    bodyRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
    setPendingNewCount(0)
    setStuckAwayFromTop(false)
  }

  return (
    <div className="histories-page">
      <div className="histories-page__header">
        <div className="histories-page__titles">
          <h2 className="histories-page__title">Crash Histories</h2>
          <p className="histories-page__subtitle">Recent Crash rounds</p>
        </div>
        <div className="histories-page__controls">
          <span
            className={`live-pill is-${status}`}
            title={statusReason ?? statusLabel(status)}
          >
            <span className="live-pill__dot" aria-hidden="true" />
            {statusLabel(status)}
          </span>
          <button
            type="button"
            className="icon-button"
            onClick={() => void refresh()}
            disabled={isRefreshing}
            aria-label="Refresh crash history"
            title="Refresh"
          >
            <IconRefresh size={15} />
          </button>
        </div>
      </div>

      {statusReason ? (
        <p className="histories-page__status-reason" role="status">
          {statusReason}
        </p>
      ) : null}

      <section className="history-table" aria-label="Crash history">
        <div className="history-table__head">
          <span>Round</span>
          <span>Multiplier</span>
          <span>Time</span>
          <span aria-hidden="true" />
        </div>

        {pendingNewCount > 0 ? (
          <button
            type="button"
            className="history-table__new-banner"
            onClick={jumpToLatest}
          >
            {pendingNewCount} new result{pendingNewCount === 1 ? '' : 's'}
          </button>
        ) : null}

        <div
          className="history-table__body"
          ref={bodyRef}
          onScroll={handleScroll}
        >
          {rounds.length === 0 ? (
            <p className="history-table__empty">
              {status === 'live'
                ? 'Waiting for the next completed Crash round…'
                : 'No crash history yet. Open bc.game/game/crash and keep this side panel open to stream completed rounds.'}
            </p>
          ) : (
            rounds.map((round) => {
              const tone = getMultiplierTone(round.multiplier)
              return (
                <div
                  key={round.roundId}
                  className={`history-row ${
                    newestHighlightIds.has(round.roundId) ? 'is-new' : ''
                  }`}
                >
                  <span className="history-row__id">#{round.roundId}</span>
                  <span>
                    <span className={`multiplier-pill is-${tone}`}>
                      {formatMultiplier(round.multiplier)}
                    </span>
                  </span>
                  <span className="history-row__time">
                    {formatRoundTime(round.timestamp)}
                  </span>
                  <span className="history-row__chevron" aria-hidden="true">
                    <IconChevronRight size={14} />
                  </span>
                </div>
              )
            })
          )}
        </div>

        <div className="history-table__footer">
          <span className="history-table__footer-live">
            <span
              className={`history-table__footer-live-dot ${
                status === 'live' ? 'is-live' : ''
              }`}
              aria-hidden="true"
            />
            {status === 'live' ? 'Live data feed' : 'Feed idle'}
          </span>
          <span>
            <IconList size={11} /> Showing latest {rounds.length} results
          </span>
        </div>
      </section>

      <p className="histories-page__note">
        Multiplier colors are for readability only and do not predict future Crash
        results. History is read from the open BC.GAME Crash page.
      </p>
    </div>
  )
}
