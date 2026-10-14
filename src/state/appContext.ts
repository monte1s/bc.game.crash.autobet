import { createContext } from 'react'
import type {
  AppSettings,
  CustomStrategy,
  DemoStats,
  EditorMode,
  PredefinedStrategyId,
  SelectedStrategyRef,
  StrategyConfig,
  TabId,
} from '../types'

export interface AppState {
  ready: boolean
  activeTab: TabId
  isRunning: boolean
  settings: AppSettings
  customStrategies: CustomStrategy[]
  selectedStrategy: SelectedStrategyRef
  predefinedConfigs: Record<PredefinedStrategyId, StrategyConfig>
  editor: EditorMode
  confirmDeleteId: string | null
  demoStats: DemoStats
  toast: string | null
}

export interface AppContextValue {
  state: AppState
  setTab: (tab: TabId) => void
  selectStrategy: (selected: SelectedStrategyRef) => void
  updateSettings: (settings: Partial<AppSettings>) => void
  updatePredefinedConfig: (id: PredefinedStrategyId, config: StrategyConfig) => void
  openCreateEditor: () => void
  openEditEditor: (strategyId: string) => void
  openConfigurePredefined: (strategyId: PredefinedStrategyId) => void
  openConfigureCustom: (strategyId: string) => void
  closeEditor: () => void
  saveCustomStrategy: (name: string, config: StrategyConfig, existingId?: string) => void
  duplicateCustomStrategy: (strategyId: string) => void
  requestDeleteCustom: (strategyId: string) => void
  confirmDeleteCustom: () => void
  cancelDeleteCustom: () => void
  startAutoBet: () => boolean
  stopAutoBet: () => void
  getSelectedConfig: () => StrategyConfig | null
  getSelectedLabel: () => string
  clearToast: () => void
}

export const AppContext = createContext<AppContextValue | null>(null)
