import type { Metadata, Viewport } from 'next'
import { Toaster } from 'sonner'
import { AuthBootstrap } from '@/components/AuthBootstrap'
import './globals.css'

export const metadata: Metadata = {
  title: 'DogeOW RPG',
  description: 'DogeOW 独立角色扮演游戏',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#ffffff',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>
        <AuthBootstrap />
        {children}
        <Toaster richColors position="top-center" />
      </body>
    </html>
  )
}
