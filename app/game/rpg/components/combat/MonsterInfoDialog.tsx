'use client'

import { useState } from 'react'
import Image from '@/components/game/GameImage'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { useMonsterDrops } from '../../hooks/useMonsterDrops'
import type { CombatMonster } from '../../types'
import { getRpgMonsterImageUrl } from '../../utils/assetUrls'
import { getMonsterStatDisplay } from '../../utils/monsterDisplayStats'
import { CompendiumItemIcon } from '../shared/CompendiumItemIcon'

type MonsterWithMeta = CombatMonster & { damage_taken?: number }

interface MonsterInfoDialogProps {
  monster: MonsterWithMeta | null
  onClose: () => void
}

export function MonsterInfoDialog({ monster, onClose }: MonsterInfoDialogProps) {
  const [viewingImage, setViewingImage] = useState<string | null>(null)
  const { data: compendiumMonsterDrops, isLoading } = useMonsterDrops(monster?.id)

  if (!monster) return null

  const monsterStats = compendiumMonsterDrops
    ? getMonsterStatDisplay(monster, compendiumMonsterDrops.monster)
    : null

  return (
    <>
      <Dialog open={!!monster && !viewingImage} onOpenChange={open => !open && onClose()}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md overflow-y-auto p-4">
          {!compendiumMonsterDrops && <DialogTitle className="sr-only">{monster.name}</DialogTitle>}
          {compendiumMonsterDrops ? (
            <div className="space-y-4">
              {/* 顶部：图片 + 属性 */}
              <div className="flex gap-4">
                {/* 左侧图片 */}
                <button
                  type="button"
                  className="relative h-28 w-28 shrink-0 cursor-zoom-in sm:h-40 sm:w-40"
                  onClick={e => {
                    e.stopPropagation()
                    setViewingImage(getRpgMonsterImageUrl(monster.icon, true))
                  }}
                >
                  <Image
                    src={getRpgMonsterImageUrl(monster.icon, true)}
                    alt=""
                    fill
                    className="object-contain"
                  />
                </button>
                {/* 右侧属性 */}
                <div className="min-w-0 flex-1 space-y-3">
                  <div>
                    <DialogTitle className="pr-5 text-lg font-bold">{compendiumMonsterDrops.monster.name}</DialogTitle>
                    <p className="text-muted-foreground text-sm">
                      Lv.{monsterStats?.level ?? compendiumMonsterDrops.monster.level} ·{' '}
                      {getMonsterTypeName(compendiumMonsterDrops.monster.type)}
                    </p>
                  </div>

                  {monsterStats && (
                    <div className="space-y-1 text-sm">
                      <p>生命: {monsterStats.hp}</p>
                      <p>攻击: {monsterStats.attack}</p>
                      <p>防御: {monsterStats.defense}</p>
                      <p>经验: {monsterStats.experience}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* 底部：可能掉落 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">可能掉落</h4>
                  {compendiumMonsterDrops.drop_rates && (
                    <span className="text-muted-foreground text-xs">
                      装备: {compendiumMonsterDrops.drop_rates.item}% | 金币:{' '}
                      {compendiumMonsterDrops.drop_rates.gold}%
                    </span>
                  )}
                </div>
                {compendiumMonsterDrops.possible_items.length > 0 ? (
                  <div className="grid grid-cols-4 gap-1">
                    {compendiumMonsterDrops.possible_items.map(item => (
                      <div key={item.id} className="bg-muted rounded p-1 text-center">
                        <span className="relative mx-auto flex h-8 w-8 items-center justify-center">
                          <CompendiumItemIcon item={item} className="drop-shadow-sm" />
                        </span>
                        <p className="truncate text-xs">{item.name}</p>
                        {item.drop_rate !== undefined && (
                          <p className="text-muted-foreground text-[10px]">{item.drop_rate}%</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">暂无物品掉落数据</p>
                )}
              </div>
            </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">加载中...</p>
            </div>
          ) : (
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">加载失败</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 查看大图 */}
      {viewingImage && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90"
          onClick={() => setViewingImage(null)}
        >
          <div className="relative max-h-[90vh] max-w-[90vw]" onClick={e => e.stopPropagation()}>
            <Image
              src={viewingImage}
              alt=""
              width={800}
              height={800}
              className="max-h-[90vh] w-auto object-contain"
            />
            <button
              type="button"
              className="absolute -top-10 -right-10 cursor-pointer text-3xl text-white"
              onClick={() => setViewingImage(null)}
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </>
  )
}

function getMonsterTypeName(type: string): string {
  const names: Record<string, string> = {
    normal: '普通',
    elite: '精英',
    boss: 'BOSS',
  }
  return names[type] || type
}
