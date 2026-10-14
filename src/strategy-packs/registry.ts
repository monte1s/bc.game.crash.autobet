import type { StrategyConfig } from '../types'
import type {
  RegisteredStrategySkill,
  StrategyPack,
  StrategySkill,
} from './types'

const packs = new Map<string, StrategyPack>()
const skills = new Map<string, RegisteredStrategySkill>()

function assertUniqueStrategyIds(pack: StrategyPack) {
  const seen = new Set<string>()
  for (const strategy of pack.strategies) {
    if (seen.has(strategy.id)) {
      throw new Error(
        `[strategy-packs] Duplicate strategy id "${strategy.id}" inside pack "${pack.id}"`,
      )
    }
    seen.add(strategy.id)

    const existing = skills.get(strategy.id)
    if (existing && existing.packId !== pack.id) {
      throw new Error(
        `[strategy-packs] Strategy id "${strategy.id}" already registered by pack "${existing.packId}"`,
      )
    }
  }
}

/** Register a pack. Re-registering the same pack id replaces it. */
export function registerStrategyPack(pack: StrategyPack): void {
  if (!pack.id.trim()) {
    throw new Error('[strategy-packs] Pack id is required')
  }
  if (!Array.isArray(pack.strategies) || pack.strategies.length === 0) {
    throw new Error(`[strategy-packs] Pack "${pack.id}" has no strategies`)
  }

  const previous = packs.get(pack.id)
  if (previous) {
    for (const strategy of previous.strategies) {
      skills.delete(strategy.id)
    }
  }

  assertUniqueStrategyIds(pack)
  packs.set(pack.id, pack)

  for (const strategy of pack.strategies) {
    skills.set(strategy.id, {
      ...strategy,
      packId: pack.id,
      packName: pack.name,
    })
  }
}

export function listStrategyPacks(): StrategyPack[] {
  return Array.from(packs.values())
}

export function getStrategyPack(packId: string): StrategyPack | undefined {
  return packs.get(packId)
}

export function listStrategySkills(): RegisteredStrategySkill[] {
  return Array.from(skills.values())
}

export function getStrategySkill(
  strategyId: string,
): RegisteredStrategySkill | undefined {
  return skills.get(strategyId)
}

export function hasStrategySkill(strategyId: string): boolean {
  return skills.has(strategyId)
}

export function createDefaultStrategyConfigs(): Record<string, StrategyConfig> {
  return Object.fromEntries(
    listStrategySkills().map((strategy) => [
      strategy.id,
      { ...strategy.defaultConfig },
    ]),
  )
}

/** Compatibility shape used by existing UI cards. */
export function toPredefinedStrategyDefinition(
  strategy: StrategySkill | RegisteredStrategySkill,
) {
  const packId = 'packId' in strategy ? strategy.packId : undefined
  return {
    id: strategy.id,
    name: strategy.name,
    description: strategy.description,
    accent: strategy.accent,
    icon: strategy.icon,
    defaultConfig: strategy.defaultConfig,
    packId,
  }
}
