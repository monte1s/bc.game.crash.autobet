import { listStrategyPacks, listStrategySkills } from '../strategy-packs'
import { useAppState } from '../state/useAppState'
import { CustomStrategySection } from './CustomStrategySection'
import { StrategyCard } from './StrategyCard'
import './StrategiesPage.css'
import { IconPlus } from './icons'

export function StrategiesPage() {
  const {
    state,
    selectStrategy,
    openCreateEditor,
    openEditEditor,
    openConfigurePredefined,
    openConfigureCustom,
    duplicateCustomStrategy,
    requestDeleteCustom,
  } = useAppState()

  const selectedCustomId =
    state.selectedStrategy.kind === 'custom' ? state.selectedStrategy.id : null

  const packs = listStrategyPacks()
  const unscoped = listStrategySkills().filter(
    (skill) => !packs.some((pack) => pack.id === skill.packId),
  )

  return (
    <div className="strategies-page">
      <div className="strategies-page__toolbar">
        <h2 className="strategies-page__heading">Strategy List</h2>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={openCreateEditor}
          disabled={state.isRunning}
        >
          <IconPlus size={14} />
          Custom Strategy
        </button>
      </div>

      {packs.map((pack) => (
        <section
          key={pack.id}
          className="strategies-page__pack"
          aria-labelledby={`pack-${pack.id}`}
        >
          <div className="strategies-page__pack-header">
            <h3 id={`pack-${pack.id}`} className="strategies-page__pack-title">
              {pack.name}
            </h3>
            <span className="strategies-page__pack-meta">v{pack.version}</span>
          </div>
          <div
            className="strategies-page__list"
            role="radiogroup"
            aria-label={`${pack.name} strategies`}
          >
            {pack.strategies.map((strategy) => (
              <StrategyCard
                key={strategy.id}
                strategy={strategy}
                selected={
                  state.selectedStrategy.kind === 'predefined' &&
                  state.selectedStrategy.id === strategy.id
                }
                disabled={state.isRunning}
                onSelect={() =>
                  selectStrategy({ kind: 'predefined', id: strategy.id })
                }
                onOpenDetails={() => openConfigurePredefined(strategy.id)}
              />
            ))}
          </div>
        </section>
      ))}

      {unscoped.length > 0 ? (
        <div
          className="strategies-page__list"
          role="radiogroup"
          aria-label="Other strategies"
        >
          {unscoped.map((strategy) => (
            <StrategyCard
              key={strategy.id}
              strategy={strategy}
              selected={
                state.selectedStrategy.kind === 'predefined' &&
                state.selectedStrategy.id === strategy.id
              }
              disabled={state.isRunning}
              onSelect={() =>
                selectStrategy({ kind: 'predefined', id: strategy.id })
              }
              onOpenDetails={() => openConfigurePredefined(strategy.id)}
            />
          ))}
        </div>
      ) : null}

      <CustomStrategySection
        strategies={state.customStrategies}
        selectedId={selectedCustomId}
        disabled={state.isRunning}
        onSelect={(id) => selectStrategy({ kind: 'custom', id })}
        onConfigure={openConfigureCustom}
        onEdit={openEditEditor}
        onDuplicate={duplicateCustomStrategy}
        onDelete={requestDeleteCustom}
      />

      <p className="strategies-page__demo-note">
        Demo UI only. Selecting a strategy and starting auto bet will not place real
        wagers or connect to BC.GAME account APIs.
      </p>
    </div>
  )
}
