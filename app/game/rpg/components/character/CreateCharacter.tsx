'use client'

import { useState, useCallback } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useGameStore } from '../../stores/gameStore'

interface CreateCharacterProps {
  onCreateSuccess?: () => void
  onBack?: () => void
}

function CharacterForm({ onCreateSuccess, onBack }: CreateCharacterProps) {
  const { createCharacter, isLoading, error, fetchCharacters } = useGameStore()
  const [name, setName] = useState('')
  const [gender, setGender] = useState<'male' | 'female'>('male')

  const handleSetName = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value)
  }, [])

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      const trimmed = name.trim()
      if (!trimmed) return
      try {
        await createCharacter(trimmed, gender)
        await fetchCharacters()
        onCreateSuccess?.()
      } catch (err) {
        // 错误会被全局 error 处理，保持简洁
      }
    },
    [name, gender, createCharacter, fetchCharacters, onCreateSuccess]
  )

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-4">
      <div className="bg-card border-border w-full max-w-md rounded-lg border p-6 shadow-xl">
        <div className="mb-6 flex items-center gap-2">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              disabled={isLoading}
              className="text-muted-foreground hover:text-foreground flex shrink-0 items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors disabled:opacity-50"
              aria-label="返回选择角色"
            >
              <ArrowLeft className="h-5 w-5" />
              返回
            </button>
          ) : null}
          <h2 className="text-foreground flex-1 text-center text-2xl font-bold">创建角色</h2>
          {onBack ? <span className="w-14 shrink-0" aria-hidden /> : null}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="text-foreground mb-2 block text-sm font-medium" htmlFor="char-name">
              角色名称
            </label>
            <input
              id="char-name"
              type="text"
              value={name}
              onChange={handleSetName}
              placeholder="输入角色名称"
              maxLength={16}
              autoComplete="off"
              className="border-input bg-muted text-foreground placeholder:text-muted-foreground focus:ring-primary w-full rounded-lg border px-4 py-2 focus:ring-2 focus:outline-none"
              aria-label="角色名称"
              required
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="text-foreground mb-2 block text-sm font-medium">选择性别</label>
            <div className="flex gap-3" role="radiogroup" aria-label="性别">
              <button
                type="button"
                onClick={() => setGender('male')}
                aria-pressed={gender === 'male'}
                className={`flex-1 rounded-lg border-2 p-3 transition-all ${
                  gender === 'male'
                    ? 'border-primary bg-primary/20'
                    : 'border-border bg-muted hover:border-muted-foreground/30'
                }`}
              >
                <div className="mb-1 text-2xl">♂️</div>
                <div className="text-foreground text-sm font-medium">男性</div>
              </button>
              <button
                type="button"
                onClick={() => setGender('female')}
                aria-pressed={gender === 'female'}
                className={`flex-1 rounded-lg border-2 p-3 transition-all ${
                  gender === 'female'
                    ? 'border-primary bg-primary/20'
                    : 'border-border bg-muted hover:border-muted-foreground/30'
                }`}
              >
                <div className="mb-1 text-2xl">♀️</div>
                <div className="text-foreground text-sm font-medium">女性</div>
              </button>
            </div>
          </div>

          {error && (
            <div
              className="border-destructive bg-destructive/20 text-destructive rounded-lg border p-3 text-sm"
              role="alert"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !name.trim()}
            className="bg-primary text-primary-foreground w-full rounded-lg py-3 font-medium transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? '创建中...' : '创建角色'}
          </button>
        </form>
      </div>
    </div>
  )
}

export const CreateCharacter = CharacterForm
