import styles from '../../rpg.module.css'

function compactValue(value: number): string {
  if (value >= 100_000) return `${Math.round(value / 1000)}k`
  if (value >= 10_000) return `${(value / 1000).toFixed(1)}k`
  return String(value)
}

function ResourceBar({ kind, value, max }: { kind: 'hp' | 'mana'; value: number; max: number }) {
  const label = `${kind === 'hp' ? '生命' : '魔法'} ${value}/${max}`
  const percent = max > 0 ? Math.min(100, Math.max(0, value / max * 100)) : 0
  return (
    <div data-resource-bar={kind}>
      <div className="truncate text-center text-[9px] leading-none text-white/90 tabular-nums sm:text-[10px]" title={label} aria-label={label}>
        {compactValue(value)}/{compactValue(max)}
      </div>
      <div className="mt-0.5 h-1 overflow-hidden rounded-sm bg-black/60 ring-1 ring-white/10">
        <div
          className={`${kind === 'hp' ? styles['health-bar-fill'] : styles['mana-bar-fill']} h-full bg-gradient-to-r ${kind === 'hp' ? 'from-red-700 to-rose-400' : 'from-blue-700 to-cyan-300'} transition-[width] duration-300`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}

export function CombatResourceBars({ hp, maxHp, mana, maxMana }: { hp: number; maxHp: number; mana?: number; maxMana?: number }) {
  return (
    <div data-combat-resources className="relative z-10 w-full min-w-0 space-y-0.5 rounded bg-black/45 px-1 py-0.5 backdrop-blur-sm">
      <ResourceBar kind="hp" value={hp} max={maxHp} />
      {mana != null && maxMana != null && <ResourceBar kind="mana" value={mana} max={maxMana} />}
    </div>
  )
}
