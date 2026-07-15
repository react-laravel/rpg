'use client'

import { useState } from 'react'

export function DogeowChatWidget() {
  const [open, setOpen] = useState(false)

  return (
    <aside className="fixed right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-[70]">
      {open ? (
        <div className="bg-background mb-3 h-[min(680px,calc(100dvh-7rem))] w-[min(420px,calc(100vw-2rem))] overflow-hidden rounded-2xl border shadow-2xl">
          <iframe
            title="DogeOW Chat"
            src="https://chat.dogeow.com/embed?client=rpg"
            className="h-full w-full border-0"
            sandbox="allow-forms allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
            allow="clipboard-write"
          />
        </div>
      ) : null}
      <button
        type="button"
        className="bg-primary text-primary-foreground ml-auto block rounded-full px-5 py-3 shadow-lg"
        aria-expanded={open}
        onClick={() => setOpen(value => !value)}
      >
        {open ? '关闭聊天' : '打开聊天'}
      </button>
    </aside>
  )
}
