'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useGameStore } from './stores/gameStore'
import { CreateCharacter } from './components/character/CreateCharacter'
import { CharacterSelect } from './components/character/CharacterSelect'
import { CharacterPanel } from './components/character/CharacterPanel'
import { InventoryPanel } from './components/inventory/InventoryPanel'
import { SkillPanel } from './components/skills/SkillPanel'
import { CombatPanel } from './components/combat/CombatPanel'
import { CompendiumPanel } from './components/compendium/CompendiumPanel'
import { SoundSettings } from './components/settings/SoundSettings'
import { CombatRegenSettings } from './components/settings/CombatRegenSettings'
import { FloatingTextOverlay } from './components/shared/FloatingTextOverlay'
import { ErrorBoundary } from './components/shared/ErrorBoundary'
import { useCombatWebSocket } from './hooks/useCombatWebSocket'
import { useLockAppScroll } from './hooks/useLockAppScroll'
import { RpgRegistrationGate } from './components/auth/RpgRegistrationGate'
import useAuthStore from '@/stores/authStore'
import { RpgStatusHeader } from './components/shared/RpgStatusHeader'
import { AlertCircle, X } from 'lucide-react'
import { GAME_TABS, GameNavigation } from './components/shared/GameNavigation'

import './rpg.module.css'

type GameView = 'select' | 'create' | 'game'

interface RPGGameClientProps {
  requireRegistration?: boolean
}

export default function RPGGameClient({ requireRegistration = false }: RPGGameClientProps) {
  const character = useGameStore(s => s.character)
  const characters = useGameStore(s => s.characters)
  const selectedCharacterId = useGameStore(s => s.selectedCharacterId)
  const activeTab = useGameStore(s => s.activeTab)
  const setActiveTab = useGameStore(s => s.setActiveTab)
  const fetchCharacter = useGameStore(s => s.fetchCharacter)
  const fetchCharacters = useGameStore(s => s.fetchCharacters)
  const fetchInventory = useGameStore(s => s.fetchInventory)
  const fetchSkills = useGameStore(s => s.fetchSkills)
  const fetchMaps = useGameStore(s => s.fetchMaps)
  const fetchCombatStatus = useGameStore(s => s.fetchCombatStatus)
  const fetchCombatLogs = useGameStore(s => s.fetchCombatLogs)
  const isLoading = useGameStore(s => s.isLoading)
  const error = useGameStore(s => s.error)
  const clearError = useGameStore(s => s.clearError)
  const startCombat = useGameStore(s => s.startCombat)
  const stopCombat = useGameStore(s => s.stopCombat)
  const setShouldAutoCombat = useGameStore(s => s.setShouldAutoCombat)

  const { isAuthenticated, loading: authLoading } = useAuthStore()
  const [showCreateView, setShowCreateView] = useState(false)
  const [initialFetchDone, setInitialFetchDone] = useState(false)
  const [initialLoadError, setInitialLoadError] = useState<string | null>(null)
  const [retryingCharacters, setRetryingCharacters] = useState(false)
  const contentScrollRef = useRef<HTMLDivElement | null>(null)
  const resetContentScroll = useCallback(() => {
    const scrollContainer = contentScrollRef.current
    if (scrollContainer) {
      scrollContainer.scrollTop = 0
      scrollContainer.scrollLeft = 0
    }
    window.scrollTo(0, 0)
  }, [])
  const handleTabChange = useCallback(
    (tabId: typeof activeTab) => {
      if (tabId === activeTab) return
      resetContentScroll()
      setActiveTab(tabId)
      requestAnimationFrame(resetContentScroll)
    },
    [activeTab, resetContentScroll, setActiveTab]
  )
  // 视图由数据派生，避免在 effect 中 setState；首次拉取完成前固定为 select 避免闪屏
  let resolvedView: GameView
  if (!initialFetchDone) {
    resolvedView = 'select'
  } else if (showCreateView) {
    resolvedView = 'create'
  } else if (!characters?.length && !showCreateView) {
    resolvedView = 'create'
  } else {
    resolvedView = character ? 'game' : 'select'
  }

  // 优化：所有ref初始化都适当注释
  const loadedCharacterIdRef = useRef<number | null>(null)
  const initializedRef = useRef(false)
  const startCombatRef = useRef(startCombat)
  const stopCombatRef = useRef(stopCombat)
  const setShouldAutoCombatRef = useRef(setShouldAutoCombat)
  const autoStartRequestKeyRef = useRef<string | null>(null)
  const autoStopRequestKeyRef = useRef<string | null>(null)
  const combatStatusReadyRef = useRef(false)

  useEffect(() => {
    startCombatRef.current = startCombat
    stopCombatRef.current = stopCombat
    setShouldAutoCombatRef.current = setShouldAutoCombat
  }, [startCombat, stopCombat, setShouldAutoCombat])

  // 战斗音效不再受标签页切换限制，移除 combatTabActive 门控

  useEffect(() => {
    resetContentScroll()
  }, [activeTab, resetContentScroll])

  // 战斗WebSocket注册：character 未加载时用 selectedCharacterId 订阅，确保一开始就能收战斗推送
  useCombatWebSocket(character?.id ?? selectedCharacterId ?? null)

  const isSkillsTab = activeTab === 'skills' && resolvedView === 'game' && character != null
  const usePanelInnerScroll = isSkillsTab
  useLockAppScroll(usePanelInnerScroll)

  // 自动挂机战斗：用 subscribe 避免 HP/战斗推送触发整页重渲染
  useEffect(() => {
    const runAutoCombat = () => {
      const state = useGameStore.getState()
      const {
        combatStats,
        currentHp,
        character: activeCharacter,
        currentMap,
        isFighting,
        shouldAutoCombat,
      } = state

      if (!combatStats || state.combatAction != null || state.pendingMapId != null) return

      const hpValue = currentHp ?? combatStats.max_hp ?? 0
      const autoStartKey =
        activeCharacter?.id && currentMap?.id ? `${activeCharacter.id}:${currentMap.id}` : null

      if (hpValue <= 0 && isFighting) {
        if (autoStartKey && autoStopRequestKeyRef.current !== autoStartKey) {
          autoStopRequestKeyRef.current = autoStartKey
          void stopCombatRef.current()
        }
        setShouldAutoCombatRef.current(false)
        autoStartRequestKeyRef.current = null
        return
      }
      if (hpValue > 0) autoStopRequestKeyRef.current = null

      if (!combatStatusReadyRef.current) return

      if (!shouldAutoCombat || !currentMap || !autoStartKey || hpValue <= 0) {
        autoStartRequestKeyRef.current = null
        return
      }

      if (isFighting) {
        autoStartRequestKeyRef.current = autoStartKey
        return
      }

      if (autoStartRequestKeyRef.current !== autoStartKey) {
        autoStartRequestKeyRef.current = autoStartKey
        void startCombatRef.current()
      }
    }

    const unsub = useGameStore.subscribe(runAutoCombat)
    runAutoCombat()
    return unsub
  }, [])

  // 认证完成后拉取角色列表；.then 内 setState 为异步，不触发 set-state-in-effect 规则
  useEffect(() => {
    if (authLoading || !isAuthenticated || initializedRef.current) return
    initializedRef.current = true
    fetchCharacters()
      .then(() => {
        setInitialLoadError(useGameStore.getState().error)
        setInitialFetchDone(true)
      })
      .catch(() => setInitialFetchDone(true))
  }, [authLoading, isAuthenticated, fetchCharacters])

  // 角色ID变化时批量拉取所有角色相关数据（优化fetch顺序）
  useEffect(() => {
    const characterId = selectedCharacterId || character?.id
    if (!characterId) {
      loadedCharacterIdRef.current = null
      combatStatusReadyRef.current = false
      autoStartRequestKeyRef.current = null
      autoStopRequestKeyRef.current = null
      return
    }
    if (characterId && loadedCharacterIdRef.current !== characterId) {
      loadedCharacterIdRef.current = characterId
      combatStatusReadyRef.current = false
      fetchCharacter()
      fetchInventory()
      fetchSkills()
      fetchMaps()
      fetchCombatStatus()
        .then(() => {
          if (useGameStore.getState().selectedCharacterId !== characterId) return
          const state = useGameStore.getState()
          if (state.isFighting && state.currentMap && !state.shouldAutoCombat) {
            setShouldAutoCombatRef.current(true)
          }
        })
        .finally(() => {
          if (useGameStore.getState().selectedCharacterId !== characterId) return
          combatStatusReadyRef.current = true
          const state = useGameStore.getState()
          const hpValue = state.currentHp ?? state.combatStats?.max_hp ?? 0
          const autoStartKey =
            state.character?.id && state.currentMap?.id
              ? `${state.character.id}:${state.currentMap.id}`
              : null

          if (
            state.shouldAutoCombat &&
            !state.isFighting &&
            state.currentMap &&
            autoStartKey &&
            hpValue > 0 &&
            autoStartRequestKeyRef.current !== autoStartKey
          ) {
            autoStartRequestKeyRef.current = autoStartKey
            void startCombatRef.current()
          }
        })
      fetchCombatLogs()
    }
  }, [
    selectedCharacterId,
    character?.id,
    fetchCharacter,
    fetchInventory,
    fetchSkills,
    fetchMaps,
    fetchCombatStatus,
    fetchCombatLogs,
  ])

  // 认证加载中
  if (authLoading) {
    return (
      <div className="bg-background flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="border-primary mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-t-transparent" />
          <p className="text-muted-foreground">初始化中...</p>
        </div>
      </div>
    )
  }

  // 未登录时显示注册/登录弹窗，避免 authLoading 结束后 initialFetchDone 永远为 false 导致一直“加载中”。
  if (!isAuthenticated) {
    return (
      <div className="bg-background text-foreground min-h-screen">
        <RpgRegistrationGate />
      </div>
    )
  }

  // 点击角色后正在拉取详情时，先显示加载（避免一直停在选择页）
  if (isLoading && !character) {
    return (
      <div className="bg-background flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="border-primary mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-t-transparent" />
          <p className="text-muted-foreground">加载中...</p>
        </div>
      </div>
    )
  }

  // 角色选择页面
  if (initialFetchDone && initialLoadError && !characters.length && !character) {
    return (
      <div className="bg-background flex min-h-dvh items-center justify-center p-6">
        <div
          role="alert"
          className="bg-card w-full max-w-sm rounded-xl border p-6 text-center shadow-sm"
        >
          <AlertCircle className="text-destructive mx-auto mb-3 h-8 w-8" />
          <h1 className="text-lg font-semibold">暂时无法加载角色</h1>
          <p className="text-muted-foreground mt-2 break-words text-sm">{initialLoadError}</p>
          <button
            type="button"
            disabled={retryingCharacters}
            className="bg-primary text-primary-foreground mt-5 min-h-11 rounded-lg px-5 font-medium disabled:opacity-60"
            onClick={async () => {
              setRetryingCharacters(true)
              try {
                await fetchCharacters()
                setInitialLoadError(useGameStore.getState().error)
              } finally {
                setRetryingCharacters(false)
              }
            }}
          >
            {retryingCharacters ? '正在重试…' : '重新加载'}
          </button>
        </div>
      </div>
    )
  }

  if (resolvedView === 'select') {
    return (
      <>
        {requireRegistration && <RpgRegistrationGate />}
        <CharacterSelect
          onBack={() => setShowCreateView(false)}
          onCreateCharacter={() => setShowCreateView(true)}
        />
      </>
    )
  }

  // 创建角色
  if (resolvedView === 'create') {
    return (
      <div className="bg-background text-foreground min-h-screen">
        {requireRegistration && <RpgRegistrationGate />}
        <CreateCharacter
          onCreateSuccess={() => setShowCreateView(false)}
          onBack={() => setShowCreateView(false)}
        />
      </div>
    )
  }

  // 没有选角，退出
  if (resolvedView !== 'game' || !character) {
    return null
  }

  const handleLogout = () => {
    setShowCreateView(false)
    fetchCharacters()
  }

  return (
    <div
      className={`bg-muted/30 text-foreground flex flex-col [--rpg-content-inset:0.75rem] [--rpg-status-bar-block:calc(4.5rem+env(safe-area-inset-top,0px))] sm:[--rpg-content-inset:1rem] sm:[--rpg-status-bar-block:calc(4rem+env(safe-area-inset-top,0px))] ${
        usePanelInnerScroll ? 'min-h-0 overflow-hidden overscroll-none' : 'min-h-screen'
      }`}
      style={
        usePanelInnerScroll
          ? { height: 'calc(100dvh - var(--app-header-height, 50px))' }
          : undefined
      }
    >
      {requireRegistration && <RpgRegistrationGate />}
      <FloatingTextOverlay />

      {/* 顶部状态栏 */}
      <header
        className="border-border bg-card/95 fixed inset-x-0 z-[60] flex h-[var(--rpg-status-bar-block)] items-center border-b px-3 pt-[env(safe-area-inset-top,0px)] backdrop-blur-xl sm:px-4"
        style={{ top: 'var(--app-header-height, 50px)' }}
      >
        <div className="mx-auto w-full max-w-7xl">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <RpgStatusHeader />
          </div>
        </div>
      </header>

      {/* 主体内容/导航 */}
      <main
        className={`mx-auto flex w-full max-w-7xl flex-1 flex-col overflow-hidden pt-[calc(var(--rpg-status-bar-block)+var(--rpg-content-inset))] ${
          activeTab === 'character' ? 'px-0' : 'px-[var(--rpg-content-inset)]'
        } ${usePanelInnerScroll ? 'min-h-0 pb-0' : 'pb-[var(--rpg-content-inset)]'}`}
      >
        <GameNavigation activeTab={activeTab} onTabChange={handleTabChange} />

        {error && (
          <div
            role="alert"
            className="border-destructive/30 bg-destructive/10 text-destructive mb-4 flex items-start gap-2 rounded-lg border p-3 text-sm"
          >
            <AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
            <span className="min-w-0 flex-1 break-words">{error}</span>
            <button
              type="button"
              aria-label="关闭错误提示"
              onClick={clearError}
              className="-m-1 flex h-7 w-7 shrink-0 items-center justify-center rounded hover:bg-destructive/10"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <div
          ref={contentScrollRef}
          className={`flex min-h-0 flex-1 flex-col ${
            usePanelInnerScroll
              ? 'overflow-hidden overscroll-none pb-[calc(5rem+env(safe-area-inset-bottom,0px))] lg:pb-4'
              : 'overflow-y-auto pb-[calc(8rem+env(safe-area-inset-bottom,0px))] lg:pb-4'
          }`}
        >
          <div
            id="game-panel"
            role="tabpanel"
            aria-label={GAME_TABS.find(tab => tab.id === activeTab)?.name}
            tabIndex={0}
            className={
              usePanelInnerScroll ? 'flex min-h-0 flex-1 w-full min-w-0 flex-col' : 'w-full min-w-0'
            }
          >
            <ErrorBoundary key={activeTab}>
              {activeTab === 'character' && <CharacterPanel />}
              {activeTab === 'inventory' && <InventoryPanel />}
              {activeTab === 'skills' && <SkillPanel />}
              {activeTab === 'combat' && <CombatPanel />}
              {activeTab === 'compendium' && <CompendiumPanel />}
              {activeTab === 'settings' && (
                <div className="space-y-4">
                  <CombatRegenSettings />
                  <SoundSettings onLogout={handleLogout} />
                </div>
              )}
            </ErrorBoundary>
          </div>
        </div>
      </main>

      <GameNavigation mobile activeTab={activeTab} onTabChange={handleTabChange} />
    </div>
  )
}
