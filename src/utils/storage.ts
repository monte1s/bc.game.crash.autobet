import type {
  PersistedState,
  PredefinedStrategyId,
  SelectedStrategyRef,
  StrategyConfig,
} from '../types'
import {
  DEFAULT_SELECTED_STRATEGY,
  DEFAULT_SETTINGS,
  STORAGE_KEY,
} from '../data/defaults'
import { createDefaultPredefinedConfigs } from '../data/predefinedStrategies'
import { hasStrategySkill, listStrategySkills } from '../strategy-packs'

function getFallbackStorage(): Storage | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null
  } catch {
    return null
  }
}

function hasChromeStorage(): boolean {
  return (
    typeof chrome !== 'undefined' &&
    !!chrome.storage &&
    !!chrome.storage.local
  )
}

export function createEmptyPersistedState(): PersistedState {
  return {
    settings: { ...DEFAULT_SETTINGS },
    customStrategies: [],
    selectedStrategy: { ...DEFAULT_SELECTED_STRATEGY },
    predefinedConfigs: createDefaultPredefinedConfigs() as PersistedState['predefinedConfigs'],
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function normalizePersistedState(raw: unknown): PersistedState {
  const base = createEmptyPersistedState()
  if (!isObject(raw)) {
    return base
  }

  const settings = isObject(raw.settings)
    ? { ...base.settings, ...raw.settings }
    : base.settings

  const customStrategies = Array.isArray(raw.customStrategies)
    ? raw.customStrategies.filter(isObject).map((item) => ({
        id: String(item.id ?? ''),
        name: String(item.name ?? 'Untitled'),
        createdAt: Number(item.createdAt) || Date.now(),
        updatedAt: Number(item.updatedAt) || Date.now(),
        config: {
          ...base.predefinedConfigs['fixed-amount'],
          ...(isObject(item.config) ? item.config : {}),
        },
      })).filter((item) => item.id)
    : []

  let selectedStrategy: SelectedStrategyRef = base.selectedStrategy
  const rawSelected = raw.selectedStrategy
  if (isObject(rawSelected)) {
    if (
      rawSelected.kind === 'predefined' &&
      typeof rawSelected.id === 'string' &&
      hasStrategySkill(rawSelected.id)
    ) {
      selectedStrategy = {
        kind: 'predefined',
        id: rawSelected.id as PredefinedStrategyId,
      }
    } else if (
      rawSelected.kind === 'custom' &&
      typeof rawSelected.id === 'string'
    ) {
      selectedStrategy = {
        kind: 'custom',
        id: rawSelected.id,
      }
    }
  }

  const predefinedConfigs = { ...base.predefinedConfigs }
  if (isObject(raw.predefinedConfigs)) {
    for (const strategy of listStrategySkills()) {
      const incoming = raw.predefinedConfigs[strategy.id]
      if (isObject(incoming)) {
        predefinedConfigs[strategy.id] = {
          ...predefinedConfigs[strategy.id],
          ...(incoming as Partial<StrategyConfig>),
        }
      }
    }
  }

  return {
    settings: settings as PersistedState['settings'],
    customStrategies: customStrategies as PersistedState['customStrategies'],
    selectedStrategy,
    predefinedConfigs,
  }
}

export async function loadPersistedState(): Promise<PersistedState> {
  try {
    if (hasChromeStorage()) {
      const result = await chrome.storage.local.get(STORAGE_KEY)
      return normalizePersistedState(result[STORAGE_KEY])
    }

    const fallback = getFallbackStorage()
    if (fallback) {
      const raw = fallback.getItem(STORAGE_KEY)
      return normalizePersistedState(raw ? JSON.parse(raw) : null)
    }
  } catch (error) {
    console.warn('[Crash Auto Bet] Failed to load state:', error)
  }

  return createEmptyPersistedState()
}

export async function savePersistedState(state: PersistedState): Promise<void> {
  try {
    if (hasChromeStorage()) {
      await chrome.storage.local.set({ [STORAGE_KEY]: state })
      return
    }

    const fallback = getFallbackStorage()
    if (fallback) {
      fallback.setItem(STORAGE_KEY, JSON.stringify(state))
    }
  } catch (error) {
    console.warn('[Crash Auto Bet] Failed to save state:', error)
  }
}
