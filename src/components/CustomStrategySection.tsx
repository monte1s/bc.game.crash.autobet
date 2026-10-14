import type { CustomStrategy } from '../types'
import { CustomStrategyCard } from './CustomStrategyCard'
import './CustomStrategySection.css'

interface CustomStrategySectionProps {
  strategies: CustomStrategy[]
  selectedId: string | null
  disabled?: boolean
  onSelect: (id: string) => void
  onConfigure: (id: string) => void
  onEdit: (id: string) => void
  onDuplicate: (id: string) => void
  onDelete: (id: string) => void
}

export function CustomStrategySection({
  strategies,
  selectedId,
  disabled = false,
  onSelect,
  onConfigure,
  onEdit,
  onDuplicate,
  onDelete,
}: CustomStrategySectionProps) {
  return (
    <section className="custom-section" aria-labelledby="custom-strategies-heading">
      <div className="custom-section__header">
        <h3 id="custom-strategies-heading" className="custom-section__title">
          Custom Strategies
        </h3>
        <span className="custom-section__count">{strategies.length}</span>
      </div>

      {strategies.length === 0 ? (
        <p className="custom-section__empty">
          No custom strategies yet. Create one with “+ Custom Strategy” to save your
          own bet rules.
        </p>
      ) : (
        <div className="custom-section__list" role="list">
          {strategies.map((strategy) => (
            <CustomStrategyCard
              key={strategy.id}
              strategy={strategy}
              selected={selectedId === strategy.id}
              disabled={disabled}
              onSelect={() => onSelect(strategy.id)}
              onConfigure={() => onConfigure(strategy.id)}
              onEdit={() => onEdit(strategy.id)}
              onDuplicate={() => onDuplicate(strategy.id)}
              onDelete={() => onDelete(strategy.id)}
            />
          ))}
        </div>
      )}
    </section>
  )
}
