'use client'

import useAuthStore from '@/stores/authStore'

export function RpgRegistrationGate() {
  const { beginLogin, isAuthenticated } = useAuthStore()

  if (isAuthenticated) {
    return null
  }

  return (
    <div className="flex min-h-dvh items-center justify-center p-6">
      <div className="border-border bg-card w-full max-w-md rounded-xl border p-6 text-center shadow-lg">
        <h1 className="text-xl font-semibold">开始你的冒险</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          使用 DogeOW 账号统一登录；登录完成后会自动返回游戏。
        </p>
        <button
          type="button"
          className="bg-primary text-primary-foreground mt-5 rounded-md px-4 py-2 font-medium"
          onClick={beginLogin}
        >
          前往 DogeOW 登录
        </button>
      </div>
    </div>
  )
}
