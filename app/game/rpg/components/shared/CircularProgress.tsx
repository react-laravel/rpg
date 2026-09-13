'use client'

import styles from '../../rpg.module.css'

const SIZE_PX = {
  sm: 16,
  md: 32,
  lg: 44,
} as const

type OrbSize = keyof typeof SIZE_PX
type OrbColor = 'red' | 'blue'

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
 * 圆形生命/法力球：液面按百分比填充，传奇 / Diablo 风格球体。
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
  const rimGradId = `${idBase}-rim`
  const glossId = `${idBase}-gloss`
  const glowId = `${idBase}-glow`

  if (!isOrb) {
    const fillClass =
      color === 'red' ? 'fill-red-500 dark:fill-red-400' : 'fill-blue-500 dark:fill-blue-400'
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
            <circle
              cx={cx}
              cy={cy}
              r={r}
              className={`${fillClass} transition-[clip-path] duration-300`}
            />
          </g>
        )}
      </svg>
    )
  }

  const rimOuter = r
  const rimInner = r - 3.5
  const wellR = rimInner - 0.5
  const liquidClipD = buildLiquidClipPath(pct, cx, cy, wellR)
  const level = cy + wellR - (2 * wellR * pct) / 100
  const dy = level - cy
  const dx2 = wellR * wellR - dy * dy
  const surfaceRx = dx2 > 0 ? Math.sqrt(dx2) : wellR * 0.92

  const fillStops =
    color === 'red'
      ? { top: '#fb7185', mid: '#e11d48', bottom: '#7f1d1d' }
      : { top: '#67e8f9', mid: '#2563eb', bottom: '#1e3a8a' }

  const glowClass = color === 'red' ? styles['hp-orb-glow'] : styles['mp-orb-glow']

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
          <radialGradient id={glowId} cx="50%" cy="42%" r="58%">
            <stop
              offset="0%"
              stopColor={color === 'red' ? '#fda4af' : '#a5f3fc'}
              stopOpacity="0.55"
            />
            <stop
              offset="70%"
              stopColor={color === 'red' ? '#e11d48' : '#3b82f6'}
              stopOpacity="0.18"
            />
            <stop offset="100%" stopColor="#000" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={rimGradId} x1="18%" y1="8%" x2="82%" y2="92%">
            <stop offset="0%" stopColor="#fef3c7" />
            <stop offset="28%" stopColor="#d97706" />
            <stop offset="55%" stopColor="#78350f" />
            <stop offset="78%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#451a03" />
          </linearGradient>
          <linearGradient id={fillGradId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={fillStops.top} />
            <stop offset="45%" stopColor={fillStops.mid} />
            <stop offset="100%" stopColor={fillStops.bottom} />
          </linearGradient>
          <radialGradient id={glossId} cx="32%" cy="28%" r="45%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.72" />
            <stop offset="45%" stopColor="#ffffff" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>
          <clipPath id={clipId}>
            <path d={liquidClipD} />
          </clipPath>
        </defs>

        <circle cx={cx} cy={cy} r={rimOuter} fill={`url(#${glowId})`} />
        <circle cx={cx} cy={cy} r={rimOuter - 0.5} fill={`url(#${rimGradId})`} />
        <circle
          cx={cx}
          cy={cy}
          r={rimInner}
          className="fill-[oklch(0.16_0_0)] dark:fill-[oklch(0.12_0_0)]"
        />
        <circle
          cx={cx}
          cy={cy}
          r={wellR}
          className="fill-[oklch(0.22_0.02_250)] dark:fill-[oklch(0.18_0.02_250)]"
        />

        {pct > 0 && (
          <g clipPath={`url(#${clipId})`}>
            <circle cx={cx} cy={cy} r={wellR} fill={`url(#${fillGradId})`} />
            {pct < 100 && (
              <ellipse
                cx={cx}
                cy={level}
                rx={surfaceRx}
                ry={Math.max(1.2, wellR * 0.12)}
                fill="#ffffff"
                fillOpacity="0.35"
              />
            )}
          </g>
        )}

        <ellipse
          cx={cx - wellR * 0.22}
          cy={cy - wellR * 0.28}
          rx={wellR * 0.42}
          ry={wellR * 0.28}
          fill={`url(#${glossId})`}
        />
        <circle
          cx={cx}
          cy={cy}
          r={rimInner}
          fill="none"
          stroke="rgba(255,255,255,0.18)"
          strokeWidth="0.75"
        />
        <circle
          cx={cx}
          cy={cy}
          r={rimOuter - 1}
          fill="none"
          stroke="rgba(0,0,0,0.45)"
          strokeWidth="1"
        />
      </svg>
    </div>
  )
}
