'use client'

import { Backpack, BookOpen, Settings, Sparkles, Swords, UserRound } from 'lucide-react'
import interfaceStyles from '../../interface.module.css'

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
          ? `${interfaceStyles.mobileNav} fixed inset-x-0 bottom-0 z-50 border-t px-1 pt-1 pb-[env(safe-area-inset-bottom,0px)] backdrop-blur-xl lg:hidden`
          : `${interfaceStyles.desktopNav} mb-4 hidden rounded-xl border p-1.5 lg:block`
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
            className={`${interfaceStyles.navTab} focus-visible:ring-ring relative flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg font-medium focus-visible:ring-2 focus-visible:outline-none ${
              mobile ? 'min-h-15 flex-col py-2 text-[11px]' : 'min-h-11 px-4 py-2 text-sm'
            } ${activeTab === tab.id ? '' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
          >
            <tab.icon
              aria-hidden="true"
              className="h-[18px] w-[18px]"
            />
            {tab.name}
          </button>
        ))}
      </div>
    </nav>
  )
}
