import { useAppState } from '../state/useAppState'
import { StatisticsSummary } from './StatisticsSummary'
import './BottomControlPanel.css'
import { IconPlay, IconSquare } from './icons'

export function BottomControlPanel() {
  const { state, startAutoBet, stopAutoBet, getSelectedLabel } = useAppState()

  return (
    <footer className="bottom-panel">
      {state.isRunning ? (
        <div className="bottom-panel__running" aria-live="polite">
          <span className="bottom-panel__pulse" aria-hidden="true" />
          Simulated run · {getSelectedLabel()}
        </div>
      ) : null}

      <button
        type="button"
        className={`bottom-panel__start ${state.isRunning ? 'is-running' : ''}`}
        onClick={() => {
          if (state.isRunning) {
            stopAutoBet()
          } else {
            startAutoBet()
          }
        }}
      >
        {state.isRunning ? (
          <>
            <IconSquare size={14} />
            Stop Auto Bet
          </>
        ) : (
          <>
            <IconPlay size={14} />
            Start Auto Bet
          </>
        )}
      </button>

      <StatisticsSummary stats={state.demoStats} />
    </footer>
  )
}
