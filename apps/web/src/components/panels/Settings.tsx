import { X, User as UserIcon, KeyRound, Bell, Palette, Languages, Volume2, HelpCircle, Info, Shield, Sun, Moon, ChevronRight } from 'lucide-react'
import { me } from '../../data'
import { Avatar } from './Avatar'

export function Settings({ onClose, dark, toggleDark }: { onClose: () => void; dark: boolean; toggleDark: () => void }) {
  const sections = [
    [
      { icon: UserIcon, label: 'Account', sub: 'Security, privacy, change number', color: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' },
      { icon: KeyRound, label: 'Two-step verification', sub: 'PIN, email recovery', color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' },
      { icon: Bell, label: 'Notifications', sub: 'Message, group & call tones', color: 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400' },
    ],
    [
      { icon: Palette, label: 'Appearance', sub: dark ? 'Dark theme' : 'Light theme', color: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400', action: 'toggle' as const },
      { icon: Languages, label: 'Language', sub: 'English (US)', color: 'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400' },
      { icon: Volume2, label: 'Storage & data', sub: 'Network usage, auto-download', color: 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400' },
    ],
    [
      { icon: Shield, label: 'Privacy', sub: 'Blocked contacts, last seen', color: 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400' },
      { icon: HelpCircle, label: 'Help', sub: 'FAQ, contact us, terms', color: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400' },
      { icon: Info, label: 'About', sub: 'Teletalk v2.6.0', color: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300' },
    ],
  ]
  return (
    <div className="h-full w-full bg-white dark:bg-[#111b21] flex flex-col animate-slide-in-right">
      <div className="h-14 px-3 flex items-center gap-2 border-b border-slate-100 dark:border-white/5">
        <button onClick={onClose} className="h-9 w-9 rounded-full hover:bg-slate-100 dark:hover:bg-[#1f2c33] flex items-center justify-center text-slate-600 dark:text-slate-300">
          <X className="h-4 w-4" />
        </button>
        <div className="font-semibold text-slate-900 dark:text-white text-sm">Settings</div>
      </div>
      <div className="px-5 py-5 flex items-center gap-3 border-b border-slate-100 dark:border-white/5">
        <Avatar initials={me.initials} color={me.avatarColor} size={56} />
        <div className="flex-1">
          <div className="font-semibold text-slate-900 dark:text-white">{me.name}</div>
          <div className="text-sm text-slate-500 dark:text-slate-400">Hey there, I&apos;m using Teletalk.</div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto slim-scroll py-2">
        {sections.map((group, gi) => (
          <div key={gi}>
            {group.map((it) => (
              <button key={it.label} onClick={it.action === 'toggle' ? toggleDark : undefined} className="w-full flex items-center gap-3 px-5 py-3 hover:bg-slate-50 dark:hover:bg-[#1f2c33] text-left">
                <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${it.color}`}>
                  <it.icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-800 dark:text-slate-100">{it.label}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{it.sub}</div>
                </div>
                {it.action === 'toggle' ? (
                  <div className={`relative w-10 h-6 rounded-full transition ${dark ? 'bg-brand-500' : 'bg-slate-200'}`}>
                    <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${dark ? 'left-[18px]' : 'left-0.5'}`} />
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
        <button onClick={toggleDark} className="inline-flex items-center gap-2 px-4 h-10 rounded-2xl bg-slate-100 dark:bg-[#1f2c33] hover:bg-slate-200 dark:hover:bg-[#253541] text-sm font-medium text-slate-700 dark:text-slate-200">
          {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          {dark ? 'Switch to light' : 'Switch to dark'}
        </button>
      </div>
    </div>
  )
}
