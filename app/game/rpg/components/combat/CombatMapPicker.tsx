'use client'

import { useMemo, useState } from 'react'
import { Check, ChevronDown, LoaderCircle, MapPin, RefreshCw } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useGameStore } from '../../stores/gameStore'
import { getActName } from '../../utils/combat'
import { getMapBackgroundStyle } from '../../utils/mapBackground'
import { MapCardMonsterAvatar } from './MapCardMonsterAvatar'

/** Travel controls own their pending/error feedback independently of background requests. */
export function CombatMapPicker() {
  const currentMap = useGameStore(s => s.currentMap)
  const maps = useGameStore(s => s.maps)
  const enterMap = useGameStore(s => s.enterMap)
  const fetchMaps = useGameStore(s => s.fetchMaps)
  const pendingMapId = useGameStore(s => s.pendingMapId)
  const combatAction = useGameStore(s => s.combatAction)
  const [open, setOpen] = useState(false)
  const [selectedAct, setSelectedAct] = useState<number | null>(null)
  const [travelError, setTravelError] = useState<string | null>(null)
  const [loadingMaps, setLoadingMaps] = useState(false)
  const acts = useMemo(() => [...new Set(maps.map(map => map.act))].sort((a, b) => a - b), [maps])
  const preferredAct = selectedAct ?? currentMap?.act
  const activeAct = preferredAct != null && acts.includes(preferredAct) ? preferredAct : acts[0]
  const visibleMaps = useMemo(() => maps.filter(map => map.act === activeAct), [maps, activeAct])
  const busy = pendingMapId != null || combatAction != null

  const loadMaps = async () => {
    setLoadingMaps(true)
    setTravelError(null)
    try {
      await fetchMaps()
      if (useGameStore.getState().error) setTravelError(useGameStore.getState().error)
    } finally {
      setLoadingMaps(false)
    }
  }

  return (
    <Popover
      open={open}
      onOpenChange={next => {
        setOpen(next)
        if (next) {
          setSelectedAct(currentMap?.act ?? null)
          setTravelError(null)
          if (maps.length === 0) void loadMaps()
        }
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`切换地图，当前${currentMap?.name ?? '未选择地图'}`}
          className="hover:bg-muted flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors"
        >
          <MapPin aria-hidden="true" className="text-primary hidden h-5 w-5 shrink-0 sm:block" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold sm:text-base">
              {currentMap?.name ?? '选择冒险地图'}
            </span>
            <span className="text-muted-foreground block text-[11px]">
              {currentMap ? `${getActName(currentMap.act)} · ` : ''}切换地图
            </span>
          </span>
          <ChevronDown
            aria-hidden="true"
            className={`text-muted-foreground h-4 w-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="bottom"
        collisionPadding={{ top: 88, bottom: 88, left: 12, right: 12 }}
        aria-label="选择冒险地图"
        className="flex max-h-[min(32rem,var(--radix-popover-content-available-height))] w-[min(34rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-xl p-0 shadow-xl"
      >
        <div className="border-border shrink-0 border-b px-4 py-3">
          <h2 className="text-sm font-semibold">冒险地图</h2>
          <p className="text-muted-foreground mt-1 text-xs">选择地图后将自动开始战斗</p>
        </div>
        {acts.length > 0 && (
          <div
            className="border-border flex shrink-0 gap-1 overflow-x-auto border-b p-2"
            aria-label="地图章节"
          >
            {acts.map(act => (
              <button
                key={act}
                type="button"
                aria-pressed={activeAct === act}
                onClick={() => setSelectedAct(act)}
                className={`min-h-10 shrink-0 rounded-md px-3 text-xs font-medium transition-colors ${activeAct === act ? 'bg-primary/15 text-foreground' : 'text-muted-foreground hover:bg-muted'}`}
              >
                {getActName(act)}
              </button>
            ))}
          </div>
        )}
        {travelError && (
          <p role="alert" className="bg-destructive/10 text-destructive shrink-0 px-4 py-3 text-xs">
            {travelError}，请重试。
          </p>
        )}
        <div
          className="min-h-0 space-y-2 overflow-y-auto overscroll-contain p-3"
          aria-busy={busy || loadingMaps}
        >
          {visibleMaps.map(map => {
            const current = map.id === currentMap?.id
            const pending = map.id === pendingMapId
            const levels = map.monsters?.map(monster => monster.level) ?? []
            const levelText = levels.length
              ? `Lv.${Math.min(...levels)}–${Math.max(...levels)}`
              : '未知'
            return (
              <button
                key={map.id}
                type="button"
                aria-current={current ? 'location' : undefined}
                aria-label={`${map.name}${current ? '，当前地图' : ''}`}
                disabled={busy || current}
                onClick={async () => {
                  setTravelError(null)
                  const success = await enterMap(map.id)
                  if (success) setOpen(false)
                  else setTravelError(useGameStore.getState().error ?? '地图切换未完成')
                }}
                style={getMapBackgroundStyle(map, { fill: true })}
                className={`group relative flex min-h-24 w-full overflow-hidden rounded-lg text-left text-white transition-shadow enabled:hover:ring-2 enabled:hover:ring-primary disabled:cursor-default ${current ? 'ring-primary ring-2' : ''}`}
              >
                <span
                  aria-hidden="true"
                  className="absolute inset-0 bg-gradient-to-r from-black/80 to-black/35"
                />
                <span className="relative flex min-w-0 flex-1 items-center gap-3 p-3">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{map.name}</span>
                    <span className="mt-1 block text-xs text-white/80">怪物 {levelText}</span>
                    {pending && (
                      <span role="status" className="mt-1 flex items-center gap-1 text-xs">
                        <LoaderCircle className="h-3 w-3 animate-spin" />
                        正在前往…
                      </span>
                    )}
                  </span>
                  {current ? (
                    <span className="flex shrink-0 items-center gap-1 rounded-md bg-black/40 px-2 py-1 text-xs text-amber-200">
                      <Check className="h-3 w-3" />
                      当前
                    </span>
                  ) : (
                    <span className="flex shrink-0 gap-1">
                      {map.monsters?.slice(0, 2).map(monster => (
                        <MapCardMonsterAvatar
                          key={monster.id}
                          icon={monster.icon}
                          name={monster.name}
                        />
                      ))}
                    </span>
                  )}
                </span>
              </button>
            )
          })}
          {maps.length === 0 && (
            <div className="py-6 text-center text-sm text-muted-foreground">
              {loadingMaps ? (
                <span role="status">正在加载地图…</span>
              ) : (
                <>
                  <p>暂时没有可用地图</p>
                  <button
                    type="button"
                    onClick={() => void loadMaps()}
                    className="hover:bg-muted mx-auto mt-3 flex min-h-10 items-center gap-2 rounded-md border px-3"
                  >
                    <RefreshCw className="h-4 w-4" />
                    重新加载
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
