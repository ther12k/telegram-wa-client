import { useState } from 'react'
import {
  X,
  BellOff,
  Image as ImageIcon,
  FileText,
  Link2,
  Star,
  Trash2,
  LogOut,
  ChevronRight,
} from 'lucide-react'
import type { Chat } from '../../data'
import { people } from '../../data'
import { Avatar } from './Avatar'

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

        {chat.kind === 'private' && (
          <div className="px-5 py-4 border-b border-slate-100 dark:border-white/5">
            <div className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-1">
              About
            </div>
            <div className="text-sm text-slate-700 dark:text-slate-200">{person?.about}</div>
          </div>
        )}

        <div className="py-2">
          {[
            {
              icon: BellOff,
              label: muted ? 'Muted' : 'Notifications',
              value: '',
              onClick: () => setMuted(!muted),
            },
            { icon: Star, label: 'Starred messages', value: '12' },
            { icon: ImageIcon, label: 'Media', value: '128' },
            { icon: FileText, label: 'Files', value: '14' },
            { icon: Link2, label: 'Links', value: '23' },
          ].map(
            (it: {
              icon: React.ComponentType<{ className?: string }>
              label: string
              value?: string
              onClick?: () => void
            }) => (
              <button
                key={it.label}
                onClick={it.onClick}
                className="w-full flex items-center gap-3 px-5 py-3 hover:bg-slate-50 dark:hover:bg-[#1f2c33] transition text-left"
              >
                <it.icon className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                <span className="flex-1 text-sm text-slate-800 dark:text-slate-100">
                  {it.label}
                </span>
                {it.value && (
                  <span className="text-xs text-slate-400 dark:text-slate-500">{it.value}</span>
                )}
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </button>
            ),
          )}
        </div>

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
