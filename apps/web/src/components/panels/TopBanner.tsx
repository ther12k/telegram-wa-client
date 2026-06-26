import { WifiOff, RefreshCw } from 'lucide-react'

export function TopBanner({ state }: { state: 'online' | 'offline' | 'reconnecting' }) {
  if (state === 'online') return null
  const map = {
    offline: { bg: 'bg-rose-500', text: 'No internet connection', icon: <WifiOff className="h-3.5 w-3.5" /> },
    reconnecting: { bg: 'bg-amber-500', text: 'Reconnecting\u2026', icon: <RefreshCw className="h-3.5 w-3.5 animate-spin" /> },
  } as const
  const c = map[state]
  return <div className={`${c.bg} text-white text-xs px-3 py-1.5 flex items-center justify-center gap-2 font-medium`}>{c.icon} {c.text}</div>
}
