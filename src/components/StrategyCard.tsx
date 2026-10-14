import type { PredefinedStrategyDefinition } from '../types'
import './StrategyCard.css'
import { IconChevronRight, StrategyIcon } from './icons'

interface StrategyCardProps {
  strategy: PredefinedStrategyDefinition
  selected: boolean
  disabled?: boolean
  onSelect: () => void
  onOpenDetails: () => void
}

export function StrategyCard({
  strategy,
  selected,
  disabled = false,
  onSelect,
  onOpenDetails,
}: StrategyCardProps) {
  return (
    <div
      className={`strategy-card ${selected ? 'is-selected' : ''}`}
      role="radio"
      aria-checked={selected}
      tabIndex={disabled ? -1 : 0}
      onClick={() => {
        if (!disabled) onSelect()
      }}
      onKeyDown={(event) => {
        if (disabled) return
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onSelect()
        }
      }}
    >
      <div className={`strategy-card__icon accent-${strategy.accent}`}>
        <StrategyIcon name={strategy.icon} size={16} />
      </div>
      <div className="strategy-card__body">
        <p className="strategy-card__name">{strategy.name}</p>
        <p className="strategy-card__description">{strategy.description}</p>
      </div>
      <button
        type="button"
        className="strategy-card__chevron icon-button"
        aria-label={`Configure ${strategy.name}`}
        title="Configure"
        disabled={disabled}
        onClick={(event) => {
          event.stopPropagation()
          onOpenDetails()
        }}
      >
        <IconChevronRight size={16} />
      </button>
      <span className="strategy-card__radio" aria-hidden="true" />
    </div>
  )
}
