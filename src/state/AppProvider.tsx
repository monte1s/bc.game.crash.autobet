import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from 'react'
import { getCrashBetUiStatus, placeCrashBet } from '../betting/crashBetService'
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
import { adaptCrashHistoryEntries } from '../history/crashHistoryAdapter'
import {
  connectHistoryPort,
  fetchStoredHistory,
  isHistoryEntryMessage,
  pingCrashContentScript,
  startHistoryCapture,
} from '../history/crashHistoryService'
import {
  applyRoundResult,
  computeWinRate,
  createEngineSession,
  decideRound,
  type EngineDecision,
  type EngineSession,
} from '../strategy-engine'
import type {
  AppSettings,
  BetHistoryEntry,
  CustomStrategy,
  DemoStats,
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
        | 'betHistory'
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
  | { type: 'RESET_DEMO_STATS' }
  | { type: 'APPLY_DEMO_ROUND'; stats: DemoStats }
  | { type: 'PATCH_DEMO_STATS'; stats: Partial<DemoStats> }
  | { type: 'APPEND_BET_HISTORY'; entry: BetHistoryEntry }
  | { type: 'CLEAR_BET_HISTORY' }

const BET_HISTORY_MAX = 200

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
  betHistory: [],
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
    case 'RESET_DEMO_STATS':
      return { ...state, demoStats: { ...DEMO_STATS } }
    case 'APPLY_DEMO_ROUND':
      return { ...state, demoStats: action.stats }
    case 'PATCH_DEMO_STATS':
      return {
        ...state,
        demoStats: { ...state.demoStats, ...action.stats },
      }
    case 'APPEND_BET_HISTORY':
      return {
        ...state,
        betHistory: [action.entry, ...state.betHistory].slice(0, BET_HISTORY_MAX),
      }
    case 'CLEAR_BET_HISTORY':
      return { ...state, betHistory: [] }
    default:
      return state
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  const toastTimer = useRef<number | null>(null)
  const betPollTimer = useRef<number | null>(null)
  const engineSession = useRef<EngineSession | null>(null)
  const demoStatsRef = useRef(state.demoStats)
  const pendingDecision = useRef<EngineDecision | null>(null)
  const actedForGameId = useRef<string | null>(null)
  const lastResultGameId = useRef<string | null>(null)
  const showToastRef = useRef<(message: string) => void>(() => {})

  useEffect(() => {
    demoStatsRef.current = state.demoStats
  }, [state.demoStats])

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
    showToastRef.current = showToast
  }, [showToast])

  const getSelectedLabelRef = useRef<() => string>(() => 'Strategy')

  const applyLiveResult = useCallback((gameId: string, crash: number) => {
    const session = engineSession.current
    if (!session || session.stopped) return
    if (lastResultGameId.current === gameId) return

    const decision =
      pendingDecision.current ??
      ({ action: 'skip', reason: 'no pending decision' } as EngineDecision)

    const applied = applyRoundResult(session, crash, decision)
    engineSession.current = applied.session
    lastResultGameId.current = gameId
    pendingDecision.current = null
    actedForGameId.current = null

    const prev = demoStatsRef.current
    const wins = prev.wins + (applied.outcome === 'win' ? 1 : 0)
    const losses = prev.losses + (applied.outcome === 'loss' ? 1 : 0)
    const skips = prev.skips + (applied.outcome === 'skip' ? 1 : 0)
    const totalBets =
      decision.action === 'bet' ? prev.totalBets + 1 : prev.totalBets

    dispatch({
      type: 'APPLY_DEMO_ROUND',
      stats: {
        balance: Math.max(0, applied.session.profit),
        totalBets,
        totalProfit: applied.session.profit,
        wins,
        losses,
        skips,
        winRate: computeWinRate(wins, losses),
        lastOutcome: applied.outcome,
        lastCrash: crash,
        lastTarget: decision.action === 'bet' ? decision.target : null,
        lastStake: decision.action === 'bet' ? decision.stake : null,
        lastDecisionReason: decision.reason,
      },
    })

    if (decision.action === 'bet' && applied.outcome !== 'skip') {
      dispatch({
        type: 'APPEND_BET_HISTORY',
        entry: {
          id: createId('bet'),
          roundId: gameId,
          strategyId: session.strategyId,
          strategyName: getSelectedLabelRef.current(),
          stake: decision.stake,
          target: decision.target,
          crash,
          outcome: applied.outcome,
          reason: decision.reason,
          profitDelta: applied.profitDelta,
          placedAt: Date.now(),
        },
      })
    } else if (decision.action === 'skip') {
      dispatch({
        type: 'APPEND_BET_HISTORY',
        entry: {
          id: createId('skip'),
          roundId: gameId,
          strategyId: session.strategyId,
          strategyName: getSelectedLabelRef.current(),
          stake: 0,
          target: session.config.targetMultiplier,
          crash,
          outcome: 'skip',
          reason: decision.reason,
          profitDelta: 0,
          placedAt: Date.now(),
        },
      })
    }

    if (applied.session.stopped) {
      dispatch({ type: 'SET_RUNNING', isRunning: false })
      showToastRef.current(applied.session.stopReason ?? 'Auto bet stopped')
    }
  }, [])

  useEffect(() => {
    if (!state.isRunning) {
      if (betPollTimer.current) {
        window.clearInterval(betPollTimer.current)
        betPollTimer.current = null
      }
      return
    }

    let cancelled = false
    let placing = false
    const port = connectHistoryPort()

    const onPortMessage = (message: unknown) => {
      if (cancelled) return
      if (!isHistoryEntryMessage(message)) return
      const adapted = adaptCrashHistoryEntries([message.entry])[0]
      if (!adapted) return
      applyLiveResult(adapted.roundId, adapted.multiplier)
    }

    port?.onMessage.addListener(onPortMessage)

    betPollTimer.current = window.setInterval(() => {
      void (async () => {
        if (cancelled || placing) return
        const session = engineSession.current
        if (!session || session.stopped) {
          dispatch({ type: 'SET_RUNNING', isRunning: false })
          return
        }

        const ui = await getCrashBetUiStatus()
        if (cancelled) return
        if (!ui.success || !ui.status) return

        const anchorGameId = ui.status.lastGameId ?? 'unknown'
        if (actedForGameId.current === anchorGameId) return
        if (!ui.status.bettingOpen) return

        const decision = decideRound(session)
        pendingDecision.current = decision

        if (decision.action === 'skip') {
          actedForGameId.current = anchorGameId
          dispatch({
            type: 'PATCH_DEMO_STATS',
            stats: {
              lastOutcome: 'skip',
              lastDecisionReason: decision.reason,
              lastStake: null,
              lastTarget: null,
            },
          })
          showToastRef.current(`Skip · ${decision.reason}`)
          return
        }

        placing = true
        try {
          const placed = await placeCrashBet({
            amount: decision.stake,
            target: decision.target,
          })
          if (cancelled) return

          if (placed.success) {
            actedForGameId.current = anchorGameId
            dispatch({
              type: 'PATCH_DEMO_STATS',
              stats: {
                lastDecisionReason: decision.reason,
                lastStake: decision.stake,
                lastTarget: decision.target,
              },
            })
            showToastRef.current(
              `Bet ${decision.stake} @ ${decision.target}x`,
            )
            return
          }

          if (
            placed.reason === 'not-betting-window' ||
            placed.reason === 'already-placed'
          ) {
            if (placed.reason === 'already-placed') {
              actedForGameId.current = anchorGameId
            } else {
              pendingDecision.current = null
            }
            return
          }

          pendingDecision.current = null
          showToastRef.current(placed.error ?? 'Could not place bet on page')
        } finally {
          placing = false
        }
      })()
    }, 900)

    return () => {
      cancelled = true
      try {
        port?.onMessage.removeListener(onPortMessage)
        port?.disconnect()
      } catch {
        // ignore
      }
      if (betPollTimer.current) {
        window.clearInterval(betPollTimer.current)
        betPollTimer.current = null
      }
    }
  }, [state.isRunning, applyLiveResult])

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

  useEffect(() => {
    getSelectedLabelRef.current = getSelectedLabel
  }, [getSelectedLabel])

  const value = useMemo<AppContextValue>(
    () => ({
      state,
      setTab: (tab) => dispatch({ type: 'SET_TAB', tab }),
      openBetHistory: () => dispatch({ type: 'SET_TAB', tab: 'bets' }),
      clearBetHistory: () => dispatch({ type: 'CLEAR_BET_HISTORY' }),
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
        const config = getSelectedConfig()
        if (!config) {
          showToast('Select a strategy first')
          return false
        }
        const strategyId =
          state.selectedStrategy.kind === 'predefined'
            ? state.selectedStrategy.id
            : 'custom'

        // Start immediately — no confirm dialog.
        void (async () => {
          // Best-effort ping; betting uses direct page injection and does not
          // require the content-script message port.
          const ping = await pingCrashContentScript()
          if (!ping.ready) {
            showToast('Open https://bc.game/game/crash, then try again')
            // Still continue — placeBet uses scripting.executeScript
          }

          void startHistoryCapture()
          const stored = await fetchStoredHistory()
          const rounds = adaptCrashHistoryEntries(stored)
          const history = rounds
            .slice()
            .reverse()
            .map((round) => round.multiplier)

          pendingDecision.current = null
          actedForGameId.current = null
          lastResultGameId.current = rounds[0]?.roundId ?? null

          engineSession.current = createEngineSession({
            strategyId,
            config,
            history,
          })
          dispatch({ type: 'RESET_DEMO_STATS' })
          dispatch({ type: 'SET_RUNNING', isRunning: true })

          // Place first bet right away when strategy says so.
          const decision = decideRound(engineSession.current)
          pendingDecision.current = decision
          if (decision.action === 'bet') {
            const placed = await placeCrashBet({
              amount: decision.stake,
              target: decision.target,
            })
            if (placed.success) {
              showToast(`Bet ${decision.stake} @ ${decision.target}x`)
            } else if (placed.reason !== 'not-betting-window') {
              showToast(placed.error ?? 'Waiting for next betting window…')
            } else {
              showToast('Auto bet running — waiting for bet window')
            }
          } else {
            showToast(decision.reason || 'Auto bet running (waiting for signal)')
          }
        })()

        return true
      },
      stopAutoBet: () => {
        engineSession.current = null
        pendingDecision.current = null
        actedForGameId.current = null
        dispatch({ type: 'SET_RUNNING', isRunning: false })
        showToast('Auto bet stopped')
      },
      getSelectedConfig,
      getSelectedLabel,
      clearToast: () => dispatch({ type: 'SET_TOAST', message: null }),
    }),
    [state, getSelectedConfig, getSelectedLabel, showToast],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
