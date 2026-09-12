'use client'

import { Backpack, BookOpen, Settings, Sparkles, Swords, UserRound } from 'lucide-react'

export const GAME_TABS = [
  { id: 'combat', name: '战斗', icon: Swords },
  { id: 'inventory', name: '背包', icon: Backpack },
  { id: 'character', name: '角色', icon: UserRound },
  { id: 'skills', name: '技能', icon: Sparkles },
  { id: 'compendium', name: '图鉴', icon: BookOpen },
  { id: 'settings', name: '设置', icon: Settings },
] as const

export type GameTab = (typeof GAME_TABS)[number]['id']

export function GameNavigation({
  activeTab,
  onTabChange,
  mobile = false,
}: {
  activeTab: string
  onTabChange: (tab: GameTab) => void
  mobile?: boolean
}) {
  const prefix = mobile ? 'mobile' : 'desktop'
  return (
    <nav
      aria-label="游戏导航"
      className={
        mobile
          ? 'border-border bg-card/95 fixed inset-x-0 bottom-0 z-50 border-t px-1 pb-[env(safe-area-inset-bottom,0px)] backdrop-blur-xl lg:hidden'
          : 'border-border bg-card mb-5 hidden rounded-xl border p-1.5 shadow-sm lg:block'
      }
    >
      <div role="tablist" aria-label="游戏功能" className="flex gap-1">
        {GAME_TABS.map((tab, index) => (
          <button
            key={tab.id}
            id={`${prefix}-tab-${tab.id}`}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls="game-panel"
            tabIndex={activeTab === tab.id ? 0 : -1}
            onClick={() => onTabChange(tab.id)}
            onKeyDown={event => {
              let nextIndex: number
              if (event.key === 'ArrowRight') nextIndex = (index + 1) % GAME_TABS.length
              else if (event.key === 'ArrowLeft')
                nextIndex = (index - 1 + GAME_TABS.length) % GAME_TABS.length
              else if (event.key === 'Home') nextIndex = 0
              else if (event.key === 'End') nextIndex = GAME_TABS.length - 1
              else return
              event.preventDefault()
              const nextTab = GAME_TABS[nextIndex]
              onTabChange(nextTab.id)
              document.getElementById(`${prefix}-tab-${nextTab.id}`)?.focus()
            }}
            className={`relative flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg font-medium transition-colors ${
              mobile ? 'min-h-16 flex-col py-2 text-xs' : 'min-h-11 px-4 py-2 text-sm'
            } ${activeTab === tab.id ? 'bg-primary/12 text-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
          >
            <tab.icon
              aria-hidden="true"
              className={`h-[18px] w-[18px] ${activeTab === tab.id ? 'text-amber-600 dark:text-amber-400' : ''}`}
            />
            {tab.name}
            {activeTab === tab.id && (
              <span
                aria-hidden="true"
                className="bg-primary absolute inset-x-1/3 bottom-0 h-0.5 rounded-full"
              />
            )}
          </button>
        ))}
      </div>
    </nav>
  )
}
