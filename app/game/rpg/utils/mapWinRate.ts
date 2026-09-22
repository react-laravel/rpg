import type { CombatStats, GameCharacter, MapDefinition, MonsterDefinition, SkillWithLearnedState } from '../types'

export const DIFFICULTY_COMBAT_MULTIPLIERS: Record<number, { monsterHp: number; monsterDamage: number }> = {
  0: { monsterHp: 1.0, monsterDamage: 1.0 },
  1: { monsterHp: 1.6, monsterDamage: 1.4 },
  2: { monsterHp: 2.2, monsterDamage: 1.75 },
  3: { monsterHp: 3.0, monsterDamage: 2.15 },
  4: { monsterHp: 4.0, monsterDamage: 2.6 },
  5: { monsterHp: 5.3, monsterDamage: 3.1 },
  6: { monsterHp: 7.0, monsterDamage: 3.7 },
  7: { monsterHp: 9.2, monsterDamage: 4.4 },
  8: { monsterHp: 12.0, monsterDamage: 5.2 },
  9: { monsterHp: 15.5, monsterDamage: 6.1 },
}

const PLAYER_DEFENSE_REDUCTION = 0.5
const MONSTER_DEFENSE_REDUCTION = 0.3
const MINIMUM_MONSTER_DAMAGE_RATIO = 0.05
const HP_REGEN_PER_VITALITY = 0.25
const MP_REGEN_PER_ENERGY = 0.5
const AOE_DAMAGE_MULTIPLIER = 0.7
const MAX_PULSES = 80
const PACK_SIZE_WEIGHTS = [0.2, 0.2, 0.2, 0.2, 0.2] as const

export interface MapWinRatePlayer {
  hp: number
  maxHp: number
  mana: number
  maxMana: number
  attack: number
  defense: number
  vitality: number
  energy: number
  critRate: number
  critDamage: number
  skills: Array<{
    power: number
    manaCost: number
    cooldown: number
    aoe: boolean
  }>
}

export interface MapWinRateResult {
  percent: number
  fiveElitePercent: number
  typicalPercent: number
}

interface SimMonster {
  hp: number
  attack: number
  defense: number
}

function scaledMonster(monster: MonsterDefinition, difficultyTier: number): SimMonster {
  const tier = DIFFICULTY_COMBAT_MULTIPLIERS[difficultyTier] ?? DIFFICULTY_COMBAT_MULTIPLIERS[0]
  return {
    hp: Math.max(1, Math.round(monster.hp_base * tier.monsterHp)),
    attack: Math.max(0, Math.round(monster.attack_base * tier.monsterDamage)),
    defense: Math.max(0, Math.round(monster.defense_base * tier.monsterDamage)),
  }
}

function threatScore(monster: MonsterDefinition): number {
  return monster.hp_base * Math.max(1, monster.attack_base)
}

function pickByType(monsters: MonsterDefinition[], type: MonsterDefinition['type']): MonsterDefinition | null {
  const pool = monsters.filter(monster => monster.type === type)
  if (pool.length === 0) return null
  return [...pool].sort((a, b) => threatScore(b) - threatScore(a))[0]
}

function nastiestMonster(monsters: MonsterDefinition[]): MonsterDefinition | null {
  if (monsters.length === 0) return null
  return pickByType(monsters, 'elite')
    ?? pickByType(monsters, 'boss')
    ?? [...monsters].sort((a, b) => threatScore(b) - threatScore(a))[0]
}

function typicalMonster(monsters: MonsterDefinition[]): MonsterDefinition | null {
  return pickByType(monsters, 'normal') ?? nastiestMonster(monsters)
}

function expectedPlayerHit(player: MapWinRatePlayer, defense: number, aoe: boolean, power: number): number {
  const critFactor = 1 + player.critRate * Math.max(0, player.critDamage - 1)
  const raw = Math.max(0, player.attack * (power / 100) - defense * PLAYER_DEFENSE_REDUCTION)
  const hit = raw * critFactor
  return aoe ? hit * AOE_DAMAGE_MULTIPLIER : hit
}

function pickSkill(player: MapWinRatePlayer, cooldowns: number[], aliveCount: number): number {
  let bestIndex = -1
  let bestDamage = expectedPlayerHit(player, 0, false, 100) * aliveCount
  player.skills.forEach((skill, index) => {
    if ((cooldowns[index] ?? 0) > 0 || player.mana < skill.manaCost) return
    const targets = skill.aoe ? aliveCount : 1
    const damage = expectedPlayerHit(player, 0, skill.aoe, skill.power) * targets
    if (damage > bestDamage) {
      bestDamage = damage
      bestIndex = index
    }
  })
  return bestIndex
}

export function simulatePack(player: MapWinRatePlayer, pack: SimMonster[]): boolean {
  if (pack.length === 0) return true
  const hp = { value: player.hp }
  const mana = { value: player.mana }
  const monsters = pack.map(monster => ({ ...monster }))
  const cooldowns = player.skills.map(() => 0)

  for (let pulse = 0; pulse < MAX_PULSES; pulse++) {
    const alive = monsters.filter(monster => monster.hp > 0)
    if (alive.length === 0) return true

    const skillIndex = pickSkill({ ...player, mana: mana.value }, cooldowns, alive.length)
    const skill = skillIndex >= 0 ? player.skills[skillIndex] : null
    const power = skill?.power ?? 100
    const aoe = skill?.aoe ?? false
    if (skill) {
      mana.value -= skill.manaCost
      cooldowns[skillIndex] = skill.cooldown
    }

    if (aoe) {
      alive.forEach(monster => {
        monster.hp -= expectedPlayerHit(player, monster.defense, true, power)
      })
    } else {
      const target = [...alive].sort((a, b) => a.hp - b.hp)[0]
      target.hp -= expectedPlayerHit(player, target.defense, false, power)
    }

    if (monsters.every(monster => monster.hp <= 0)) return true

    const incoming = monsters
      .filter(monster => monster.hp > 0)
      .reduce((sum, monster) => sum + monsterCounterDamage(monster.attack, player.defense), 0)
    hp.value -= incoming
    if (hp.value <= 0) return false

    hp.value = Math.min(player.maxHp, hp.value + Math.max(0, Math.round(player.vitality * HP_REGEN_PER_VITALITY)))
    mana.value = Math.min(player.maxMana, mana.value + Math.max(0, Math.round(player.energy * MP_REGEN_PER_ENERGY)))
    for (let i = 0; i < cooldowns.length; i++) {
      if (cooldowns[i] > 0) cooldowns[i] -= 1
    }
  }

  return monsters.every(monster => monster.hp <= 0)
}

function monsterCounterDamage(attack: number, defense: number): number {
  if (attack <= 0) return 0
  const raw = Math.max(
    attack * MINIMUM_MONSTER_DAMAGE_RATIO,
    attack - defense * MONSTER_DEFENSE_REDUCTION
  )
  if (raw <= 0) return 0
  return Math.max(1, Math.round(raw))
}

function packOf(template: SimMonster, count: number): SimMonster[] {
  return Array.from({ length: count }, () => ({ ...template }))
}

export function playerFromLoadout(
  character: GameCharacter | null,
  combatStats: CombatStats | null,
  skills: SkillWithLearnedState[],
  enabledSkillIds: number[]
): MapWinRatePlayer | null {
  if (!character || !combatStats) return null
  const enabled = skills.filter(
    skill =>
      skill.type === 'active' &&
      skill.is_learned &&
      enabledSkillIds.includes(skill.id) &&
      (skill.base_damage ?? 0) > 0
  )
  return {
    hp: character.current_hp ?? combatStats.max_hp,
    maxHp: combatStats.max_hp,
    mana: character.current_mana ?? combatStats.max_mana,
    maxMana: combatStats.max_mana,
    attack: combatStats.attack,
    defense: combatStats.defense,
    vitality: character.vitality,
    energy: character.energy,
    critRate: combatStats.crit_rate,
    critDamage: combatStats.crit_damage,
    skills: enabled.map(skill => ({
      power: skill.base_damage || 100,
      manaCost: skill.mana_cost,
      cooldown: skill.cooldown,
      aoe: skill.target_type === 'all',
    })),
  }
}

export function estimateMapWinRate(
  map: Pick<MapDefinition, 'monsters'>,
  player: MapWinRatePlayer,
  difficultyTier = 0
): MapWinRateResult | null {
  const monsters = map.monsters ?? []
  if (monsters.length === 0) return null
  const nasty = nastiestMonster(monsters)
  const typical = typicalMonster(monsters)
  if (!nasty || !typical) return null

  const nastyStats = scaledMonster(nasty, difficultyTier)
  const typicalStats = scaledMonster(typical, difficultyTier)
  const fiveEliteWins = simulatePack(player, packOf(nastyStats, 5)) ? 1 : 0

  let typicalScore = 0
  PACK_SIZE_WEIGHTS.forEach((weight, index) => {
    const count = index + 1
    const normalWin = simulatePack(player, packOf(typicalStats, count)) ? 1 : 0
    const eliteWin = simulatePack(player, packOf(nastyStats, count)) ? 1 : 0
    typicalScore += weight * (0.95 * normalWin + 0.05 * eliteWin)
  })

  const percent = Math.round(100 * (0.55 * typicalScore + 0.45 * fiveEliteWins))
  return {
    percent: Math.max(0, Math.min(100, percent)),
    fiveElitePercent: fiveEliteWins * 100,
    typicalPercent: Math.round(typicalScore * 100),
  }
}

export function winRateTone(percent: number): 'good' | 'ok' | 'bad' {
  if (percent >= 80) return 'good'
  if (percent >= 50) return 'ok'
  return 'bad'
}
