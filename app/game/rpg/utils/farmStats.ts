import type { CombatStats, GameCharacter, GameItem } from '../types'

export interface FarmSession {
  mapId: number
  powerKey: string
  startedAt: number
  exp: number
  lootValue: number
}

export interface FarmRates {
  expPerMin: number | null
  lootPerMin: number | null
  elapsedMs: number
}

export const FARM_RATE_MIN_MS = 15_000

export function getFarmPowerKey(
  character: Pick<GameCharacter, 'id' | 'level' | 'strength' | 'dexterity' | 'vitality' | 'energy'> | null,
  combatStats: Pick<CombatStats, 'attack' | 'defense'> | null,
  equipment: Record<string, GameItem | null>
): string {
  const slots = Object.entries(equipment)
    .map(([slot, item]) => `${slot}:${item?.id ?? 0}`)
    .sort()
  return [
    character?.id ?? 0,
    character?.level ?? 0,
    character?.strength ?? 0,
    character?.dexterity ?? 0,
    character?.vitality ?? 0,
    character?.energy ?? 0,
    combatStats?.attack ?? 0,
    combatStats?.defense ?? 0,
    ...slots,
  ].join('|')
}

export function createFarmSession(mapId: number, powerKey: string, now = Date.now()): FarmSession {
  return { mapId, powerKey, startedAt: now, exp: 0, lootValue: 0 }
}

export function reconcileFarmSession(
  session: FarmSession | null,
  mapId: number | null,
  powerKey: string,
  now = Date.now()
): FarmSession | null {
  if (mapId == null) return null
  if (!session || session.mapId !== mapId || session.powerKey !== powerKey) {
    return createFarmSession(mapId, powerKey, now)
  }
  return session
}

export function recordFarmGains(session: FarmSession, exp: number, lootValue: number): FarmSession {
  return {
    ...session,
    exp: session.exp + Math.max(0, exp),
    lootValue: session.lootValue + Math.max(0, lootValue),
  }
}

export function computeFarmRates(session: FarmSession, now = Date.now()): FarmRates {
  const elapsedMs = Math.max(0, now - session.startedAt)
  if (elapsedMs < FARM_RATE_MIN_MS) {
    return { expPerMin: null, lootPerMin: null, elapsedMs }
  }
  const minutes = elapsedMs / 60_000
  return {
    expPerMin: Math.round(session.exp / minutes),
    lootPerMin: Math.round(session.lootValue / minutes),
    elapsedMs,
  }
}

export function combatLootValue(copperGained: number, itemSellPrice?: number | null): number {
  return Math.max(0, copperGained) + Math.max(0, itemSellPrice ?? 0)
}

export function farmSessionForLoadout(
  session: FarmSession | null,
  mapId: number | null,
  character: Parameters<typeof getFarmPowerKey>[0],
  combatStats: Parameters<typeof getFarmPowerKey>[1],
  equipment: Record<string, GameItem | null>,
  now = Date.now()
): FarmSession | null {
  return reconcileFarmSession(session, mapId, getFarmPowerKey(character, combatStats, equipment), now)
}
