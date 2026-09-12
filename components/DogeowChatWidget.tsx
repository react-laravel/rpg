'use client'

import { useEffect, useRef, useState } from 'react'
import { MessageCircle, X } from 'lucide-react'

export function DogeowChatWidget() {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!open) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setOpen(false)
      triggerRef.current?.focus()
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [open])

  return (
    <aside
      aria-label="DogeOW 聊天"
      className="fixed right-3 bottom-[calc(5rem+env(safe-area-inset-bottom,0px))] z-[70] sm:right-4 lg:bottom-[max(1rem,env(safe-area-inset-bottom))]"
    >
      {open && (
        <div
          id="dogeow-chat-panel"
          className="bg-background mb-2 flex h-[min(680px,calc(100dvh-14rem-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px)))] w-[min(420px,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-2xl border shadow-2xl"
        >
          <div className="flex shrink-0 items-center justify-between border-b px-4 py-2">
            <span className="text-sm font-semibold">DogeOW 聊天</span>
            <button
              type="button"
              aria-label="关闭聊天窗口"
              className="hover:bg-muted flex h-9 w-9 items-center justify-center rounded-md"
              onClick={() => {
                setOpen(false)
                triggerRef.current?.focus()
              }}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <iframe
            title="DogeOW Chat"
            src="https://chat.dogeow.com/embed?client=rpg"
            className="min-h-0 w-full flex-1 border-0"
            sandbox="allow-forms allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
            allow="clipboard-write"
          />
        </div>
      )}
      <button
        ref={triggerRef}
        type="button"
        aria-label={open ? '关闭聊天' : '打开聊天'}
        aria-expanded={open}
        aria-controls={open ? 'dogeow-chat-panel' : undefined}
        className="bg-card text-foreground hover:bg-muted ml-auto flex h-11 items-center justify-center gap-2 rounded-full border px-3 shadow-md transition-colors lg:px-4"
        onClick={() => setOpen(value => !value)}
      >
        {open ? (
          <X aria-hidden="true" className="h-5 w-5" />
        ) : (
          <MessageCircle aria-hidden="true" className="h-5 w-5" />
        )}
        <span className="hidden text-sm lg:inline">{open ? '关闭聊天' : '聊天'}</span>
      </button>
    </aside>
  )
}
