import { Loader2, Inbox, AlertCircle, WifiOff, RefreshCw } from 'lucide-react'

export function StateOverlay({ state, onRetry }: { state: 'loading' | 'empty' | 'error' | 'offline' | 'reconnecting' | null; onRetry?: () => void }) {
  if (!state) return null
  const cfg = {
    loading: { icon: <Loader2 className="h-6 w-6 animate-spin text-brand-500" />, title: 'Loading your chats', sub: 'Just a moment\u2026' },
    empty: { icon: <Inbox className="h-8 w-8 text-slate-400" />, title: 'No chats yet', sub: 'Start a conversation to see it here.' },
    error: { icon: <AlertCircle className="h-8 w-8 text-rose-500" />, title: 'Something went wrong', sub: "We couldn't load your messages." },
    offline: { icon: <WifiOff className="h-8 w-8 text-amber-500" />, title: "You're offline", sub: 'Check your connection to continue.' },
    reconnecting: { icon: <RefreshCw className="h-8 w-8 text-brand-500 animate-spin" />, title: 'Reconnecting\u2026', sub: "Hold on, we're restoring your connection." },
  }[state]
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-white/70 dark:bg-[#0b141a]/80 backdrop-blur-sm animate-fade-in">
      <div className="text-center max-w-xs px-6">
        <div className="mx-auto h-16 w-16 rounded-full bg-white dark:bg-[#111b21] shadow-lg flex items-center justify-center mb-4">{cfg.icon}</div>
        <div className="font-semibold text-slate-900 dark:text-white">{cfg.title}</div>
        <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">{cfg.sub}</div>
        {(state === 'error' || state === 'offline') && onRetry && (
          <button onClick={onRetry} className="mt-4 px-4 h-9 rounded-2xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium inline-flex items-center gap-2">
            <RefreshCw className="h-3.5 w-3.5" /> Try again
          </button>
        )}
      </div>
    </div>
  )
}
