import RPGGameClient from './game/rpg/RPGGameClient'
import { DogeowChatWidget } from '@/components/DogeowChatWidget'

export default function HomePage() {
  return (
    <>
      <RPGGameClient />
      <DogeowChatWidget />
    </>
  )
}
