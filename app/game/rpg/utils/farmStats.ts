import type { CombatStats, GameCharacter, GameItem } from '../types'

export interface FarmSession {
  mapId: number
  powerKey: string
  startedAt: number
  lastTickAt: number
  elapsedMs: number
  exp: number
  lootValue: number
  damage: number
  taken: number
  kills: number
}

export interface FarmGain {
  exp?: number
  lootValue?: number
  damage?: number
  taken?: number
  kills?: number
}

export interface FarmRates {
  expPerMin: number | null
  lootPerMin: number | null
  damagePerMin: number | null
  takenPerMin: number | null
  killsPerMin: number | null
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
  return {
    mapId,
    powerKey,
    startedAt: now,
    lastTickAt: now,
    elapsedMs: 0,
    exp: 0,
    lootValue: 0,
    damage: 0,
    taken: 0,
    kills: 0,
  }
}

/** 刷新后接着算，不把关页时间算进每分钟速度 */
export function resumeFarmSession(session: FarmSession, now = Date.now()): FarmSession {
  return { ...session, lastTickAt: now }
}

export function reconcileFarmSession(
  session: FarmSession | null,
  mapId: number | null,
  powerKey: string,
  now = Date.now(),
  powerKeyReady = true
): FarmSession | null {
  if (mapId == null) return null
  if (!session || session.mapId !== mapId) {
    return createFarmSession(mapId, powerKey, now)
  }
  if (!powerKeyReady) {
    return session
  }
  if (session.powerKey !== powerKey) {
    return createFarmSession(mapId, powerKey, now)
  }
  return session
}

export function recordFarmGains(
  session: FarmSession,
  gain: FarmGain,
  now = Date.now()
): FarmSession {
  const elapsedMs = session.elapsedMs + Math.max(0, now - session.lastTickAt)
  return {
    ...session,
    elapsedMs,
    lastTickAt: now,
    exp: session.exp + Math.max(0, gain.exp ?? 0),
    lootValue: session.lootValue + Math.max(0, gain.lootValue ?? 0),
    damage: session.damage + Math.max(0, gain.damage ?? 0),
    taken: session.taken + Math.max(0, gain.taken ?? 0),
    kills: session.kills + Math.max(0, gain.kills ?? 0),
  }
}

export function computeFarmRates(session: FarmSession, now = Date.now()): FarmRates {
  const elapsedMs = session.elapsedMs + Math.max(0, now - session.lastTickAt)
  if (elapsedMs < FARM_RATE_MIN_MS) {
    return {
      expPerMin: null,
      lootPerMin: null,
      damagePerMin: null,
      takenPerMin: null,
      killsPerMin: null,
      elapsedMs,
    }
  }
  const minutes = elapsedMs / 60_000
  return {
    expPerMin: Math.round(session.exp / minutes),
    lootPerMin: Math.round(session.lootValue / minutes),
    damagePerMin: Math.round(session.damage / minutes),
    takenPerMin: Math.round(session.taken / minutes),
    killsPerMin: Math.round(session.kills / minutes),
    elapsedMs,
  }
}

export function countRoundKills(
  monsters?: Array<{ hp?: number; damage_taken?: number; was_attacked?: boolean } | null>
): number {
  if (!monsters) return 0
  return monsters.filter(
    monster =>
      monster != null &&
      (monster.hp ?? 0) <= 0 &&
      ((monster.damage_taken ?? 0) > 0 || monster.was_attacked === true)
  ).length
}

export function formatEta(remainingExp: number, expPerMin: number | null): string | null {
  if (expPerMin == null || expPerMin <= 0 || remainingExp <= 0) return null
  const minutes = remainingExp / expPerMin
  if (minutes < 1) return '<1分钟'
  if (minutes < 60) return `${Math.round(minutes)}分钟`
  const hours = minutes / 60
  if (hours < 10) return `${hours.toFixed(1)}小时`
  return `${Math.round(hours)}小时`
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
  return reconcileFarmSession(
    session,
    mapId,
    getFarmPowerKey(character, combatStats, equipment),
    now,
    combatStats != null
  )
}
