'use client'

import styles from '../../rpg.module.css'

const SIZE_PX = {
  sm: 16,
  md: 28,
  lg: 40,
} as const

type OrbSize = keyof typeof SIZE_PX
type OrbColor = 'red' | 'blue'

/** Soft HUD fills: deep crimson / sapphire, not neon rose / cyan. */
const ORB_FILL: Record<OrbColor, { top: string; mid: string; bottom: string }> = {
  red: { top: '#e11d48', mid: '#9f1239', bottom: '#4c0519' },
  blue: { top: '#38bdf8', mid: '#1d4ed8', bottom: '#172554' },
}

function buildLiquidClipPath(pct: number, cx: number, cy: number, r: number): string {
  if (pct <= 0) return 'M0 0L0 0Z'
  if (pct >= 100) {
    return `M ${cx} ${cy} m -${r} 0 a ${r} ${r} 0 1 1 ${r * 2} 0 a ${r} ${r} 0 1 1 -${r * 2} 0`
  }
  const level = cy + r - (2 * r * pct) / 100
  const dy = level - cy
  const dx2 = r * r - dy * dy
  const dx = dx2 > 0 ? Math.sqrt(dx2) : 0
  const largeArc = level <= cy ? 1 : 0
  return `M ${cx + dx} ${level} A ${r} ${r} 0 ${largeArc} 1 ${cx - dx} ${level} L ${cx + dx} ${level} Z`
}

/**
 * 圆形生命/法力球：无金属外框，仅液面按百分比填充；液面高度 CSS 过渡。
 */
export function CircularProgress({
  percent,
  color,
  size = 'sm',
  label,
}: {
  percent: number
  color: OrbColor
  size?: OrbSize
  /** 无障碍名称，如「生命」「法力」 */
  label?: string
}) {
  const pct = Math.max(0, Math.min(100, percent))
  const diameter = SIZE_PX[size]
  const r = diameter / 2
  const cx = r
  const cy = r
  const isOrb = size !== 'sm'
  const idBase = `rpg-hpmp-${color}-${size}`

  const clipId = `${idBase}-clip`
  const fillGradId = `${idBase}-fill`
  const glossId = `${idBase}-gloss`
  const wellClipId = `${idBase}-well`

  if (!isOrb) {
    const fillClass =
      color === 'red' ? 'fill-red-600 dark:fill-red-500' : 'fill-blue-600 dark:fill-blue-500'
    const clipPathD = buildLiquidClipPath(pct, cx, cy, r)
    return (
      <svg
        width={diameter}
        height={diameter}
        className="shrink-0"
        aria-hidden={label ? undefined : true}
        role={label ? 'img' : undefined}
        aria-label={label ? `${label} ${Math.round(pct)}%` : undefined}
      >
        <defs>
          <clipPath id={clipId}>
            <path d={clipPathD} />
          </clipPath>
        </defs>
        <circle cx={cx} cy={cy} r={r} className="fill-muted" />
        {pct > 0 && (
          <g clipPath={`url(#${clipId})`}>
            <circle cx={cx} cy={cy} r={r} className={fillClass} />
          </g>
        )}
      </svg>
    )
  }

  const wellR = r - 0.5
  const fillStops = ORB_FILL[color]
  const glowClass = color === 'red' ? styles['hp-orb-glow'] : styles['mp-orb-glow']
  // Full well = 0; empty = translated down by diameter so the liquid disk clears the clip.
  const liquidOffsetY = ((100 - pct) / 100) * diameter

  return (
    <div
      className={`${styles['resource-orb']} ${glowClass} shrink-0`}
      style={{ width: diameter, height: diameter }}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
    >
      <svg width={diameter} height={diameter} viewBox={`0 0 ${diameter} ${diameter}`} aria-hidden>
        <defs>
          <linearGradient id={fillGradId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={fillStops.top} />
            <stop offset="48%" stopColor={fillStops.mid} />
            <stop offset="100%" stopColor={fillStops.bottom} />
          </linearGradient>
          <radialGradient id={glossId} cx="32%" cy="28%" r="45%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.34" />
            <stop offset="50%" stopColor="#ffffff" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>
          <clipPath id={wellClipId}>
            <circle cx={cx} cy={cy} r={wellR} />
          </clipPath>
        </defs>

        {/* 暗底井 */}
        <circle
          cx={cx}
          cy={cy}
          r={wellR}
          className="fill-[oklch(0.2_0.02_250)] dark:fill-[oklch(0.16_0.02_250)]"
        />

        <g clipPath={`url(#${wellClipId})`}>
          <g
            className={styles['orb-liquid']}
            style={{ transform: `translateY(${liquidOffsetY}px)` }}
            data-testid="orb-liquid"
          >
            <circle cx={cx} cy={cy} r={wellR} fill={`url(#${fillGradId})`} />
            {/* 液面高光条：随液面一起移动 */}
            <ellipse
              cx={cx}
              cy={cy - wellR * 0.92}
              rx={wellR * 0.92}
              ry={Math.max(1.1, wellR * 0.14)}
              fill="#ffffff"
              fillOpacity="0.18"
            />
          </g>
        </g>

        <ellipse
          className={styles['orb-gloss']}
          cx={cx - wellR * 0.22}
          cy={cy - wellR * 0.28}
          rx={wellR * 0.42}
          ry={wellR * 0.28}
          fill={`url(#${glossId})`}
        />
      </svg>
    </div>
  )
}
