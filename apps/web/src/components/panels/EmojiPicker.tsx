import { useState } from 'react'
import { Search, X } from 'lucide-react'
import { emojiGroups } from '../../data'

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
