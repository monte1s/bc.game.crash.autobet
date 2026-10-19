import './App.css'
import { BetHistoriesPage } from './components/BetHistoriesPage'
import { BottomControlPanel } from './components/BottomControlPanel'
import { ConfirmDialog } from './components/ConfirmDialog'
import { HistoriesPage } from './components/HistoriesPage'
import { SettingsPage } from './components/SettingsPage'
import { SidebarHeader } from './components/SidebarHeader'
import { SidebarNavigation } from './components/SidebarNavigation'
import { StrategiesPage } from './components/StrategiesPage'
import { StrategyConfiguration } from './components/StrategyConfiguration'
import { StrategyEditor } from './components/StrategyEditor'
import { getPredefinedStrategy } from './data/predefinedStrategies'
import { AppProvider } from './state/AppProvider'
import { useAppState } from './state/useAppState'
import './components/StrategyEditor.css'

function AppContent() {
  const {
    state,
    setTab,
    closeEditor,
    saveCustomStrategy,
    updatePredefinedConfig,
    confirmDeleteCustom,
    cancelDeleteCustom,
    clearToast,
  } = useAppState()

  const handleClose = () => {
    window.close()
  }

  if (!state.ready) {
    return <div className="app-loading">Loading…</div>
  }

  const editor = state.editor

  const editingCustom =
    editor.type === 'edit'
      ? state.customStrategies.find((item) => item.id === editor.strategyId)
      : null

  const configuringPredefined =
    editor.type === 'configure-predefined'
      ? {
          definition: getPredefinedStrategy(editor.strategyId),
          config: state.predefinedConfigs[editor.strategyId],
          id: editor.strategyId,
        }
      : null

  const configuringCustom =
    editor.type === 'configure-custom'
      ? state.customStrategies.find((item) => item.id === editor.strategyId)
      : null

  const deleteTarget = state.confirmDeleteId
    ? state.customStrategies.find((item) => item.id === state.confirmDeleteId)
    : null

  const showBottomPanel =
    state.activeTab === 'strategies' ||
    state.activeTab === 'histories' ||
    state.activeTab === 'bets'

  const shellClass = [
    'app-shell',
    state.settings.compactMode ? 'app-shell--compact' : '',
    state.activeTab === 'settings' ? 'app-shell--settings' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={shellClass}>
      <SidebarHeader
        onOpenSettings={() => setTab('settings')}
        onClose={handleClose}
      />
      <SidebarNavigation
        activeTab={state.activeTab}
        onChange={setTab}
        disabled={state.editor.type !== 'closed'}
        betCount={state.betHistory.length}
      />

      <div className="app-main">
        {state.activeTab === 'strategies' ? (
          <>
            <div className="app-scroll">
              <StrategiesPage />
            </div>
            <BottomControlPanel />
          </>
        ) : state.activeTab === 'histories' ? (
          <>
            <div className="app-scroll">
              <HistoriesPage active={state.activeTab === 'histories'} />
            </div>
            {showBottomPanel ? <BottomControlPanel /> : null}
          </>
        ) : state.activeTab === 'bets' ? (
          <>
            <div className="app-scroll">
              <BetHistoriesPage />
            </div>
            {showBottomPanel ? <BottomControlPanel /> : null}
          </>
        ) : (
          <div className="app-scroll">
            <SettingsPage />
          </div>
        )}
      </div>

      {state.editor.type === 'create' && (
        <StrategyEditor
          mode="create"
          initialConfig={{
            ...state.predefinedConfigs['fixed-amount'],
            initialBet: state.settings.defaultStartingBet,
            targetMultiplier: state.settings.defaultTargetMultiplier,
            maxBets: state.settings.defaultMaxBets,
            maxBetAmount: state.settings.maxBetAmount,
            stopLoss: state.settings.stopLoss,
            takeProfit: state.settings.takeProfit,
          }}
          onCancel={closeEditor}
          onSave={(name, config) => saveCustomStrategy(name, config)}
        />
      )}

      {state.editor.type === 'edit' && editingCustom && (
        <StrategyEditor
          mode="edit"
          initialName={editingCustom.name}
          initialConfig={editingCustom.config}
          onCancel={closeEditor}
          onSave={(name, config) =>
            saveCustomStrategy(name, config, editingCustom.id)
          }
        />
      )}

      {configuringPredefined?.definition && configuringPredefined.config && (
        <StrategyConfiguration
          title={`${configuringPredefined.definition.name} Settings`}
          initialConfig={configuringPredefined.config}
          strategyId={configuringPredefined.id}
          onCancel={closeEditor}
          onSave={(config) => {
            updatePredefinedConfig(configuringPredefined.id, config)
            closeEditor()
          }}
        />
      )}

      {configuringCustom && (
        <StrategyConfiguration
          title={`${configuringCustom.name} Settings`}
          initialConfig={configuringCustom.config}
          strategyId="custom"
          showAdjustmentMode
          onCancel={closeEditor}
          onSave={(config) => {
            saveCustomStrategy(configuringCustom.name, config, configuringCustom.id)
          }}
        />
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete strategy?"
        message={
          deleteTarget
            ? `“${deleteTarget.name}” will be removed from your custom strategies. This cannot be undone.`
            : ''
        }
        onCancel={cancelDeleteCustom}
        onConfirm={confirmDeleteCustom}
      />

      {state.toast ? (
        <div className="app-toast" role="status" onClick={clearToast}>
          {state.toast}
        </div>
      ) : null}
    </div>
  )
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  )
}
