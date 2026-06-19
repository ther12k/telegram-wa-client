import { useState } from 'react'
import {
  X,
  Search,
  Bell,
  BellOff,
  Image as ImageIcon,
  FileText,
  Link2,
  Star,
  Trash2,
  LogOut,
  User as UserIcon,
  KeyRound,
  Moon,
  Sun,
  Palette,
  Languages,
  HelpCircle,
  Info,
  Shield,
  Volume2,
  ChevronRight,
  CheckCheck,
  Check as CheckIcon,
  AlertCircle,
  WifiOff,
  RefreshCw,
  Loader2,
  Inbox,
} from 'lucide-react'
import type { Chat } from '../data'
import { people, me, emojiGroups } from '../data'

/* ---------------- Avatar ---------------- */
export function Avatar({
  initials,
  color,
  size = 40,
  online,
  ring,
}: {
  initials: string
  color: string
  size?: number
  online?: boolean
  ring?: boolean
}) {
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <div
        className={`h-full w-full rounded-full bg-gradient-to-br ${color} flex items-center justify-center text-white font-semibold ${ring ? 'ring-2 ring-white dark:ring-[#111b21]' : ''}`}
        style={{ fontSize: size * 0.38 }}
      >
        {initials}
      </div>
      {online && (
        <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[#111b21]" />
      )}
    </div>
  )
}

/* ---------------- Contact Info Panel ---------------- */
export function ContactInfo({ chat, onClose }: { chat: Chat; onClose: () => void; dark: boolean }) {
  const [muted, setMuted] = useState(false)
  const person = people[chat.id as keyof typeof people]

  return (
    <div className="h-full w-full bg-white dark:bg-[#111b21] flex flex-col animate-slide-in-right">
      <div className="h-14 px-3 flex items-center gap-2 border-b border-slate-100 dark:border-white/5">
        <button
          onClick={onClose}
          className="h-9 w-9 rounded-full hover:bg-slate-100 dark:hover:bg-[#1f2c33] flex items-center justify-center text-slate-600 dark:text-slate-300"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="font-semibold text-slate-900 dark:text-white text-sm">
          {chat.kind === 'private'
            ? 'Contact info'
            : chat.kind === 'group'
              ? 'Group info'
              : 'Channel info'}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto slim-scroll">
        {/* Hero */}
        <div className="pt-8 pb-6 flex flex-col items-center border-b border-slate-100 dark:border-white/5">
          <Avatar initials={chat.initials} color={chat.avatarColor} size={104} />
          <div className="mt-4 text-xl font-semibold text-slate-900 dark:text-white">
            {chat.name}
          </div>
          <div className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {chat.kind === 'private' && person?.phone}
            {chat.kind === 'group' && `${chat.members} members`}
            {chat.kind === 'channel' && `${chat.members?.toLocaleString()} subscribers`}
          </div>
          <div className="mt-4 flex items-center gap-2">
            {['📞', '💬', '🔍', '🔕'].map((e, i) => (
              <button
                key={i}
                className="h-11 w-11 rounded-full bg-slate-100 dark:bg-[#1f2c33] hover:bg-brand-50 dark:hover:bg-brand-900/30 hover:text-brand-600 text-slate-600 dark:text-slate-300 text-lg flex items-center justify-center transition"
              >
                {e}
              </button>
            ))}
          </div>
        </div>

        {/* About */}
        {chat.kind === 'private' && (
          <div className="px-5 py-4 border-b border-slate-100 dark:border-white/5">
            <div className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-1">
              About
            </div>
            <div className="text-sm text-slate-700 dark:text-slate-200">{person?.about}</div>
          </div>
        )}

        {/* Settings list */}
        <div className="py-2">
          {[
            {
              icon: muted ? BellOff : Bell,
              label: muted ? 'Muted' : 'Notifications',
              value: '',
              onClick: () => setMuted(!muted),
            },
            { icon: Star, label: 'Starred messages', value: '12' },
            { icon: ImageIcon, label: 'Media', value: '128' },
            { icon: FileText, label: 'Files', value: '14' },
            { icon: Link2, label: 'Links', value: '23' },
          ].map((it) => (
            <button
              key={it.label}
              onClick={it.onClick}
              className="w-full flex items-center gap-3 px-5 py-3 hover:bg-slate-50 dark:hover:bg-[#1f2c33] transition text-left"
            >
              <it.icon className="h-4 w-4 text-slate-500 dark:text-slate-400" />
              <span className="flex-1 text-sm text-slate-800 dark:text-slate-100">{it.label}</span>
              {it.value && (
                <span className="text-xs text-slate-400 dark:text-slate-500">{it.value}</span>
              )}
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </button>
          ))}
        </div>

        {/* Members (group/channel) */}
        {(chat.kind === 'group' || chat.kind === 'channel') && (
          <div className="border-t border-slate-100 dark:border-white/5 py-2">
            <div className="px-5 py-2 text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">
              Members
            </div>
            {Object.values(people)
              .slice(0, 5)
              .map((p) => (
                <div
                  key={p.name}
                  className="flex items-center gap-3 px-5 py-2.5 hover:bg-slate-50 dark:hover:bg-[#1f2c33]"
                >
                  <Avatar initials={p.initials} color={p.avatarColor} size={36} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">
                      {p.name}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {p.about}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}

        {/* Danger */}
        <div className="border-t border-slate-100 dark:border-white/5 py-2">
          <button className="w-full flex items-center gap-3 px-5 py-3 hover:bg-slate-50 dark:hover:bg-[#1f2c33] text-red-500 text-sm">
            <Trash2 className="h-4 w-4" /> Block {chat.name}
          </button>
          <button className="w-full flex items-center gap-3 px-5 py-3 hover:bg-slate-50 dark:hover:bg-[#1f2c33] text-red-500 text-sm">
            <LogOut className="h-4 w-4" /> {chat.kind === 'private' ? 'Delete chat' : 'Leave group'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ---------------- Settings Screen ---------------- */
export function Settings({
  onClose,
  dark,
  toggleDark,
}: {
  onClose: () => void
  dark: boolean
  toggleDark: () => void
}) {
  const sections = [
    [
      {
        icon: UserIcon,
        label: 'Account',
        sub: 'Security, privacy, change number',
        color: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
      },
      {
        icon: KeyRound,
        label: 'Two-step verification',
        sub: 'PIN, email recovery',
        color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
      },
      {
        icon: Bell,
        label: 'Notifications',
        sub: 'Message, group & call tones',
        color: 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400',
      },
    ],
    [
      {
        icon: Palette,
        label: 'Appearance',
        sub: dark ? 'Dark theme' : 'Light theme',
        color: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400',
        action: 'toggle',
      },
      {
        icon: Languages,
        label: 'Language',
        sub: 'English (US)',
        color: 'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400',
      },
      {
        icon: Volume2,
        label: 'Storage & data',
        sub: 'Network usage, auto-download',
        color: 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400',
      },
    ],
    [
      {
        icon: Shield,
        label: 'Privacy',
        sub: 'Blocked contacts, last seen',
        color: 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400',
      },
      {
        icon: HelpCircle,
        label: 'Help',
        sub: 'FAQ, contact us, terms',
        color: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400',
      },
      {
        icon: Info,
        label: 'About',
        sub: 'Teletalk v2.6.0',
        color: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300',
      },
    ],
  ]
  return (
    <div className="h-full w-full bg-white dark:bg-[#111b21] flex flex-col animate-slide-in-right">
      <div className="h-14 px-3 flex items-center gap-2 border-b border-slate-100 dark:border-white/5">
        <button
          onClick={onClose}
          className="h-9 w-9 rounded-full hover:bg-slate-100 dark:hover:bg-[#1f2c33] flex items-center justify-center text-slate-600 dark:text-slate-300"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="font-semibold text-slate-900 dark:text-white text-sm">Settings</div>
      </div>

      {/* Profile card */}
      <div className="px-5 py-5 flex items-center gap-3 border-b border-slate-100 dark:border-white/5">
        <Avatar initials={me.initials} color={me.avatarColor} size={56} />
        <div className="flex-1">
          <div className="font-semibold text-slate-900 dark:text-white">{me.name}</div>
          <div className="text-sm text-slate-500 dark:text-slate-400">
            Hey there, I'm using Teletalk.
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto slim-scroll py-2">
        {sections.map((group, gi) => (
          <div key={gi}>
            {group.map((it) => (
              <button
                key={it.label}
                onClick={it.action === 'toggle' ? toggleDark : undefined}
                className="w-full flex items-center gap-3 px-5 py-3 hover:bg-slate-50 dark:hover:bg-[#1f2c33] text-left"
              >
                <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${it.color}`}>
                  <it.icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-800 dark:text-slate-100">
                    {it.label}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {it.sub}
                  </div>
                </div>
                {it.action === 'toggle' ? (
                  <div
                    className={`relative w-10 h-6 rounded-full transition ${dark ? 'bg-brand-500' : 'bg-slate-200'}`}
                  >
                    <div
                      className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${dark ? 'left-[18px]' : 'left-0.5'}`}
                    />
                  </div>
                ) : (
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                )}
              </button>
            ))}
            {gi < sections.length - 1 && <div className="my-1" />}
          </div>
        ))}
      </div>

      <div className="border-t border-slate-100 dark:border-white/5 p-4 text-center">
        <button
          onClick={toggleDark}
          className="inline-flex items-center gap-2 px-4 h-10 rounded-2xl bg-slate-100 dark:bg-[#1f2c33] hover:bg-slate-200 dark:hover:bg-[#253541] text-sm font-medium text-slate-700 dark:text-slate-200"
        >
          {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          {dark ? 'Switch to light' : 'Switch to dark'}
        </button>
      </div>
    </div>
  )
}

/* ---------------- Emoji Picker ---------------- */
export function EmojiPicker({
  onPick,
  onClose,
}: {
  onPick: (e: string) => void
  onClose: () => void
}) {
  const [q, setQ] = useState('')
  const [tab, setTab] = useState(0)
  const filtered = (emojiGroups[tab]?.items ?? []).filter((e) => !q || e.includes(q))
  return (
    <div className="w-72 sm:w-80 bg-white dark:bg-[#202c33] rounded-2xl shadow-2xl shadow-black/20 ring-1 ring-slate-200 dark:ring-white/10 overflow-hidden animate-fade-in">
      <div className="p-2 border-b border-slate-100 dark:border-white/5 flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search emoji"
            className="w-full h-8 pl-8 pr-2 rounded-lg bg-slate-100 dark:bg-[#2a3942] text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
        <button
          onClick={onClose}
          className="h-8 w-8 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-[#1f2c33] flex items-center justify-center"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="flex border-b border-slate-100 dark:border-white/5">
        {emojiGroups.map((g, i) => (
          <button
            key={g.name}
            onClick={() => setTab(i)}
            className={`flex-1 py-2 text-[11px] font-medium transition ${tab === i ? 'text-brand-600 border-b-2 border-brand-500' : 'text-slate-500 dark:text-slate-400'}`}
          >
            {g.name}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-8 gap-0.5 p-2 h-52 overflow-y-auto slim-scroll">
        {filtered.map((e, i) => (
          <button
            key={i}
            onClick={() => onPick(e)}
            className="h-8 w-8 rounded-lg hover:bg-slate-100 dark:hover:bg-[#1f2c33] text-lg flex items-center justify-center"
          >
            {e}
          </button>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-8 text-center text-xs text-slate-400 py-8">No emoji found</div>
        )}
      </div>
    </div>
  )
}

/* ---------------- Media Viewer (lightbox) ---------------- */
export function MediaViewer({
  url,
  caption,
  onClose,
}: {
  url: string
  caption?: string
  onClose: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center animate-fade-in"
      onClick={onClose}
    >
      <button className="absolute top-4 right-4 h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center backdrop-blur">
        <X className="h-5 w-5" />
      </button>
      <div onClick={(e) => e.stopPropagation()} className="max-w-3xl max-h-[85vh] mx-4">
        <img
          src={url}
          alt="preview"
          className="max-h-[80vh] max-w-full rounded-xl shadow-2xl object-contain"
        />
        {caption && (
          <div className="mt-3 text-center text-sm text-white/80 max-w-lg mx-auto">{caption}</div>
        )}
      </div>
    </div>
  )
}

/* ---------------- Status Overlays ---------------- */
export function StateOverlay({
  state,
  onRetry,
}: {
  state: 'loading' | 'empty' | 'error' | 'offline' | 'reconnecting' | null
  onRetry?: () => void
}) {
  if (!state) return null
  const cfg = {
    loading: {
      icon: <Loader2 className="h-6 w-6 animate-spin text-brand-500" />,
      title: 'Loading your chats',
      sub: 'Just a moment…',
    },
    empty: {
      icon: <Inbox className="h-8 w-8 text-slate-400" />,
      title: 'No chats yet',
      sub: 'Start a conversation to see it here.',
    },
    error: {
      icon: <AlertCircle className="h-8 w-8 text-rose-500" />,
      title: 'Something went wrong',
      sub: "We couldn't load your messages.",
    },
    offline: {
      icon: <WifiOff className="h-8 w-8 text-amber-500" />,
      title: "You're offline",
      sub: 'Check your connection to continue.',
    },
    reconnecting: {
      icon: <RefreshCw className="h-8 w-8 text-brand-500 animate-spin" />,
      title: 'Reconnecting…',
      sub: "Hold on, we're restoring your connection.",
    },
  }[state]
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-white/70 dark:bg-[#0b141a]/80 backdrop-blur-sm animate-fade-in">
      <div className="text-center max-w-xs px-6">
        <div className="mx-auto h-16 w-16 rounded-full bg-white dark:bg-[#111b21] shadow-lg flex items-center justify-center mb-4">
          {cfg.icon}
        </div>
        <div className="font-semibold text-slate-900 dark:text-white">{cfg.title}</div>
        <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">{cfg.sub}</div>
        {(state === 'error' || state === 'offline') && onRetry && (
          <button
            onClick={onRetry}
            className="mt-4 px-4 h-9 rounded-2xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium inline-flex items-center gap-2"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Try again
          </button>
        )}
      </div>
    </div>
  )
}

/* ---------------- Reconnecting banner ---------------- */
export function TopBanner({ state }: { state: 'online' | 'offline' | 'reconnecting' }) {
  if (state === 'online') return null
  const map = {
    offline: {
      bg: 'bg-rose-500',
      text: 'No internet connection',
      icon: <WifiOff className="h-3.5 w-3.5" />,
    },
    reconnecting: {
      bg: 'bg-amber-500',
      text: 'Reconnecting…',
      icon: <RefreshCw className="h-3.5 w-3.5 animate-spin" />,
    },
  } as const
  const c = map[state]
  return (
    <div
      className={`${c.bg} text-white text-xs px-3 py-1.5 flex items-center justify-center gap-2 font-medium`}
    >
      {c.icon} {c.text}
    </div>
  )
}

/* ---------------- Context menu ---------------- */
export function ContextMenu({
  x,
  y,
  onClose,
  onPin,
  onMute,
  onArchive,
  onUnread,
  onDelete,
}: {
  x: number
  y: number
  onClose: () => void
  onPin: () => void
  onMute: () => void
  onArchive: () => void
  onUnread: () => void
  onDelete: () => void
}) {
  const items: Array<{
    label: string
    icon: React.ReactNode
    onClick: () => void
    danger?: boolean
  }> = [
    { label: 'Pin chat', icon: <Star className="h-3.5 w-3.5" />, onClick: onPin },
    { label: 'Mute notifications', icon: <BellOff className="h-3.5 w-3.5" />, onClick: onMute },
    { label: 'Archive chat', icon: <Inbox className="h-3.5 w-3.5" />, onClick: onArchive },
    { label: 'Mark as unread', icon: <CheckCheck className="h-3.5 w-3.5" />, onClick: onUnread },
    {
      label: 'Delete chat',
      icon: <Trash2 className="h-3.5 w-3.5" />,
      onClick: onDelete,
      danger: true,
    },
  ]
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className="fixed z-50 bg-white dark:bg-[#233138] rounded-xl shadow-2xl shadow-black/20 ring-1 ring-slate-200 dark:ring-white/10 py-1.5 min-w-[200px] animate-fade-in"
        style={{ left: x, top: y }}
      >
        {items.map((it) => (
          <button
            key={it.label}
            onClick={() => {
              it.onClick()
              onClose()
            }}
            className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2.5 hover:bg-slate-100 dark:hover:bg-[#1f2c33] transition ${it.danger ? 'text-rose-500' : 'text-slate-700 dark:text-slate-200'}`}
          >
            {it.icon} {it.label}
          </button>
        ))}
      </div>
    </>
  )
}

/* ---------------- Check marks ---------------- */
export function StatusIcon({ status }: { status?: 'sending' | 'sent' | 'read' | 'failed' }) {
  if (!status) return null
  if (status === 'sending')
    return (
      <div className="h-3 w-3 rounded-full border-2 border-slate-400 border-t-transparent animate-spin" />
    )
  if (status === 'failed') return <AlertCircle className="h-3.5 w-3.5 text-rose-500" />
  if (status === 'sent') return <CheckIcon className="h-3.5 w-3.5 text-slate-400" />
  return <CheckCheck className="h-3.5 w-3.5 text-sky-500" />
}
