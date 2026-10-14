import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from 'react'
import {
  createId,
  DEFAULT_SELECTED_STRATEGY,
  DEFAULT_SETTINGS,
  DEMO_STATS,
} from '../data/defaults'
import {
  createDefaultPredefinedConfigs,
  getPredefinedStrategy,
} from '../data/predefinedStrategies'
import type {
  AppSettings,
  CustomStrategy,
  PredefinedStrategyId,
  SelectedStrategyRef,
  StrategyConfig,
  TabId,
} from '../types'
import { loadPersistedState, savePersistedState } from '../utils/storage'
import { AppContext, type AppContextValue, type AppState } from './appContext'

type AppAction =
  | {
      type: 'HYDRATE'
      payload: Omit<
        AppState,
        | 'ready'
        | 'isRunning'
        | 'editor'
        | 'confirmDeleteId'
        | 'demoStats'
        | 'toast'
        | 'activeTab'
      >
    }
  | { type: 'SET_TAB'; tab: TabId }
  | { type: 'SET_RUNNING'; isRunning: boolean }
  | { type: 'UPDATE_SETTINGS'; settings: Partial<AppSettings> }
  | { type: 'SELECT_STRATEGY'; selected: SelectedStrategyRef }
  | {
      type: 'UPDATE_PREDEFINED_CONFIG'
      id: PredefinedStrategyId
      config: StrategyConfig
    }
  | { type: 'UPSERT_CUSTOM'; strategy: CustomStrategy }
  | { type: 'DELETE_CUSTOM'; id: string }
  | { type: 'SET_EDITOR'; editor: AppState['editor'] }
  | { type: 'SET_CONFIRM_DELETE'; id: string | null }
  | { type: 'SET_TOAST'; message: string | null }
  | { type: 'BUMP_DEMO_STATS' }

const initialState: AppState = {
  ready: false,
  activeTab: 'strategies',
  isRunning: false,
  settings: { ...DEFAULT_SETTINGS },
  customStrategies: [],
  selectedStrategy: { ...DEFAULT_SELECTED_STRATEGY },
  predefinedConfigs:
    createDefaultPredefinedConfigs() as AppState['predefinedConfigs'],
  editor: { type: 'closed' },
  confirmDeleteId: null,
  demoStats: { ...DEMO_STATS },
  toast: null,
}

function reducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'HYDRATE':
      return {
        ...state,
        ...action.payload,
        ready: true,
      }
    case 'SET_TAB':
      return { ...state, activeTab: action.tab }
    case 'SET_RUNNING':
      return { ...state, isRunning: action.isRunning }
    case 'UPDATE_SETTINGS':
      return {
        ...state,
        settings: { ...state.settings, ...action.settings },
      }
    case 'SELECT_STRATEGY':
      return { ...state, selectedStrategy: action.selected }
    case 'UPDATE_PREDEFINED_CONFIG':
      return {
        ...state,
        predefinedConfigs: {
          ...state.predefinedConfigs,
          [action.id]: action.config,
        },
      }
    case 'UPSERT_CUSTOM': {
      const exists = state.customStrategies.some(
        (item) => item.id === action.strategy.id,
      )
      const customStrategies = exists
        ? state.customStrategies.map((item) =>
            item.id === action.strategy.id ? action.strategy : item,
          )
        : [...state.customStrategies, action.strategy]
      return { ...state, customStrategies }
    }
    case 'DELETE_CUSTOM': {
      const customStrategies = state.customStrategies.filter(
        (item) => item.id !== action.id,
      )
      const selectedStrategy =
        state.selectedStrategy.kind === 'custom' &&
        state.selectedStrategy.id === action.id
          ? ({ ...DEFAULT_SELECTED_STRATEGY } as SelectedStrategyRef)
          : state.selectedStrategy
      return {
        ...state,
        customStrategies,
        selectedStrategy,
        confirmDeleteId: null,
        editor:
          state.editor.type === 'edit' && state.editor.strategyId === action.id
            ? { type: 'closed' }
            : state.editor.type === 'configure-custom' &&
                state.editor.strategyId === action.id
              ? { type: 'closed' }
              : state.editor,
      }
    }
    case 'SET_EDITOR':
      return { ...state, editor: action.editor }
    case 'SET_CONFIRM_DELETE':
      return { ...state, confirmDeleteId: action.id }
    case 'SET_TOAST':
      return { ...state, toast: action.message }
    case 'BUMP_DEMO_STATS':
      return {
        ...state,
        demoStats: {
          balance: Number((Math.random() * 0.01).toFixed(8)),
          totalBets: state.demoStats.totalBets + 1,
          totalProfit: Number(((Math.random() - 0.45) * 0.002).toFixed(8)),
        },
      }
    default:
      return state
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  const toastTimer = useRef<number | null>(null)
  const demoTimer = useRef<number | null>(null)

  useEffect(() => {
    let cancelled = false
    loadPersistedState().then((persisted) => {
      if (cancelled) return
      dispatch({
        type: 'HYDRATE',
        payload: {
          settings: persisted.settings,
          customStrategies: persisted.customStrategies,
          selectedStrategy: persisted.selectedStrategy,
          predefinedConfigs: persisted.predefinedConfigs,
        },
      })
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!state.ready) return
    void savePersistedState({
      settings: state.settings,
      customStrategies: state.customStrategies,
      selectedStrategy: state.selectedStrategy,
      predefinedConfigs: state.predefinedConfigs,
    })
  }, [
    state.ready,
    state.settings,
    state.customStrategies,
    state.selectedStrategy,
    state.predefinedConfigs,
  ])

  const showToast = useCallback((message: string) => {
    dispatch({ type: 'SET_TOAST', message })
    if (toastTimer.current) {
      window.clearTimeout(toastTimer.current)
    }
    toastTimer.current = window.setTimeout(() => {
      dispatch({ type: 'SET_TOAST', message: null })
    }, 2400)
  }, [])

  useEffect(() => {
    if (!state.isRunning) {
      if (demoTimer.current) {
        window.clearInterval(demoTimer.current)
        demoTimer.current = null
      }
      return
    }

    demoTimer.current = window.setInterval(() => {
      dispatch({ type: 'BUMP_DEMO_STATS' })
    }, 1800)

    return () => {
      if (demoTimer.current) {
        window.clearInterval(demoTimer.current)
        demoTimer.current = null
      }
    }
  }, [state.isRunning])

  const getSelectedConfig = useCallback((): StrategyConfig | null => {
    if (state.selectedStrategy.kind === 'predefined') {
      return state.predefinedConfigs[state.selectedStrategy.id] ?? null
    }
    return (
      state.customStrategies.find((item) => item.id === state.selectedStrategy.id)
        ?.config ?? null
    )
  }, [state.selectedStrategy, state.predefinedConfigs, state.customStrategies])

  const getSelectedLabel = useCallback((): string => {
    if (state.selectedStrategy.kind === 'predefined') {
      return getPredefinedStrategy(state.selectedStrategy.id)?.name ?? 'Strategy'
    }
    return (
      state.customStrategies.find((item) => item.id === state.selectedStrategy.id)
        ?.name ?? 'Custom Strategy'
    )
  }, [state.selectedStrategy, state.customStrategies])

  const value = useMemo<AppContextValue>(
    () => ({
      state,
      setTab: (tab) => dispatch({ type: 'SET_TAB', tab }),
      selectStrategy: (selected) =>
        dispatch({ type: 'SELECT_STRATEGY', selected }),
      updateSettings: (settings) =>
        dispatch({ type: 'UPDATE_SETTINGS', settings }),
      updatePredefinedConfig: (id, config) =>
        dispatch({ type: 'UPDATE_PREDEFINED_CONFIG', id, config }),
      openCreateEditor: () =>
        dispatch({ type: 'SET_EDITOR', editor: { type: 'create' } }),
      openEditEditor: (strategyId) =>
        dispatch({ type: 'SET_EDITOR', editor: { type: 'edit', strategyId } }),
      openConfigurePredefined: (strategyId) =>
        dispatch({
          type: 'SET_EDITOR',
          editor: { type: 'configure-predefined', strategyId },
        }),
      openConfigureCustom: (strategyId) =>
        dispatch({
          type: 'SET_EDITOR',
          editor: { type: 'configure-custom', strategyId },
        }),
      closeEditor: () =>
        dispatch({ type: 'SET_EDITOR', editor: { type: 'closed' } }),
      saveCustomStrategy: (name, config, existingId) => {
        const now = Date.now()
        if (existingId) {
          const existing = state.customStrategies.find(
            (item) => item.id === existingId,
          )
          if (!existing) return
          dispatch({
            type: 'UPSERT_CUSTOM',
            strategy: {
              ...existing,
              name,
              config,
              updatedAt: now,
            },
          })
          showToast('Strategy updated')
        } else {
          const strategy: CustomStrategy = {
            id: createId('custom'),
            name,
            config,
            createdAt: now,
            updatedAt: now,
          }
          dispatch({ type: 'UPSERT_CUSTOM', strategy })
          dispatch({
            type: 'SELECT_STRATEGY',
            selected: { kind: 'custom', id: strategy.id },
          })
          showToast('Strategy saved')
        }
        dispatch({ type: 'SET_EDITOR', editor: { type: 'closed' } })
      },
      duplicateCustomStrategy: (strategyId) => {
        const source = state.customStrategies.find(
          (item) => item.id === strategyId,
        )
        if (!source) return
        const now = Date.now()
        const copy: CustomStrategy = {
          ...source,
          id: createId('custom'),
          name: `${source.name} Copy`,
          createdAt: now,
          updatedAt: now,
          config: { ...source.config },
        }
        dispatch({ type: 'UPSERT_CUSTOM', strategy: copy })
        showToast('Strategy duplicated')
      },
      requestDeleteCustom: (strategyId) =>
        dispatch({ type: 'SET_CONFIRM_DELETE', id: strategyId }),
      confirmDeleteCustom: () => {
        if (!state.confirmDeleteId) return
        dispatch({ type: 'DELETE_CUSTOM', id: state.confirmDeleteId })
        showToast('Strategy deleted')
      },
      cancelDeleteCustom: () =>
        dispatch({ type: 'SET_CONFIRM_DELETE', id: null }),
      startAutoBet: () => {
        if (!getSelectedConfig()) {
          showToast('Select a strategy first')
          return false
        }
        if (state.settings.confirmBeforeStarting) {
          const accepted = window.confirm(
            `Start simulated auto bet with "${getSelectedLabel()}"?\n\nThis is a UI demonstration only — no real bets are placed.`,
          )
          if (!accepted) return false
        }
        dispatch({ type: 'SET_RUNNING', isRunning: true })
        showToast('Demo auto bet running')
        return true
      },
      stopAutoBet: () => {
        dispatch({ type: 'SET_RUNNING', isRunning: false })
        showToast('Demo auto bet stopped')
      },
      getSelectedConfig,
      getSelectedLabel,
      clearToast: () => dispatch({ type: 'SET_TOAST', message: null }),
    }),
    [state, getSelectedConfig, getSelectedLabel, showToast],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
