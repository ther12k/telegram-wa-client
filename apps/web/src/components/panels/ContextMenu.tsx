import { Star, BellOff, Inbox, CheckCheck, Trash2 } from 'lucide-react'

export function ContextMenu({ x, y, onClose, onPin, onMute, onArchive, onUnread, onDelete }: {
  x: number; y: number; onClose: () => void; onPin: () => void; onMute: () => void; onArchive: () => void; onUnread: () => void; onDelete: () => void
}) {
  const items = [
    { label: 'Pin chat', icon: <Star className="h-3.5 w-3.5" />, onClick: onPin },
    { label: 'Mute notifications', icon: <BellOff className="h-3.5 w-3.5" />, onClick: onMute },
    { label: 'Archive chat', icon: <Inbox className="h-3.5 w-3.5" />, onClick: onArchive },
    { label: 'Mark as unread', icon: <CheckCheck className="h-3.5 w-3.5" />, onClick: onUnread },
    { label: 'Delete chat', icon: <Trash2 className="h-3.5 w-3.5" />, onClick: onDelete, danger: true },
  ]
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="fixed z-50 bg-white dark:bg-[#233138] rounded-xl shadow-2xl shadow-black/20 ring-1 ring-slate-200 dark:ring-white/10 py-1.5 min-w-[200px] animate-fade-in"
        style={{ left: x, top: y }}>
        {items.map((it) => (
          <button key={it.label} onClick={() => { it.onClick(); onClose() }}
            className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2.5 hover:bg-slate-100 dark:hover:bg-[#1f2c33] transition ${it.danger ? 'text-rose-500' : 'text-slate-700 dark:text-slate-200'}`}>
            {it.icon} {it.label}
          </button>
        ))}
      </div>
    </>
  )
}
