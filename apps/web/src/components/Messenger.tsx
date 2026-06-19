import { useState, useEffect, useRef, useMemo } from 'react'
import {
  Search,
  Plus,
  MoreVertical,
  Phone,
  Video,
  Smile,
  Paperclip,
  Mic,
  Send,
  Camera,
  FileText,
  Image as ImageIcon,
  UserPlus,
  Archive,
  Pin,
  BellOff,
  BadgeCheck,
  Reply,
  X,
  Play,
  File as FileIcon,
  Hash,
  Users,
  MessageCircle,
  Settings as SettingsIcon,
  Moon,
  Sun,
  Archive as ArchiveIcon,
  Bookmark,
  Search as Search2,
  Command,
  ArrowLeft,
} from 'lucide-react'
import type { Chat, Message } from '../data'
import { people, me, chats as initialChats } from '../data'
import {
  Avatar,
  EmojiPicker,
  MediaViewer,
  StatusIcon,
  ContactInfo,
  Settings,
  ContextMenu,
} from './Panels'
import { api } from '../api'

type Filter = 'all' | 'unread' | 'private' | 'groups' | 'channels'

export default function Messenger({
  dark,
  toggleDark,
  onLogout,
}: {
  dark: boolean
  toggleDark: () => void
  onLogout: () => void
}) {
  const [chats, setChats] = useState<Chat[]>(initialChats)
  const [selectedId, setSelectedId] = useState<string | null>(initialChats[0]?.id ?? null)
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')
  const [composer, setComposer] = useState('')
  const [showEmoji, setShowEmoji] = useState(false)
  const [showAttach, setShowAttach] = useState(false)
  const [showInfo, setShowInfo] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [mediaUrl, setMediaUrl] = useState<string | null>(null)
  const [menu, setMenu] = useState<{ x: number; y: number; chatId: string } | null>(null)
  const [replyTo, setReplyTo] = useState<Message | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const selectedChat = chats.find((c) => c.id === selectedId) ?? null

  // Auto-scroll when messages change
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [selectedChat?.messages.length, selectedId])

  const filteredChats = useMemo(() => {
    let list = chats.filter((c) => !c.archived)
    if (filter === 'unread') list = list.filter((c) => !!c.unread)
    if (filter === 'private') list = list.filter((c) => c.kind === 'private')
    if (filter === 'groups') list = list.filter((c) => c.kind === 'group')
    if (filter === 'channels') list = list.filter((c) => c.kind === 'channel')
    if (query) {
      const q = query.toLowerCase()
      list = list.filter(
        (c) => c.name.toLowerCase().includes(q) || c.subtitle.toLowerCase().includes(q),
      )
    }
    return list.sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned))
  }, [chats, filter, query])

  const sendMessage = async (text: string) => {
    if (!text.trim() || !selectedChat) return
    const id = `op-${crypto.randomUUID()}`
    const currentChatId = selectedChat.id
    const currentReplyId = replyTo?.id
    const newMsg: Message = {
      id,
      kind: replyTo ? 'reply' : 'text',
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'sending',
      replyTo: currentReplyId,
    }
    setChats((prev) =>
      prev.map((c) =>
        c.id === selectedChat.id
          ? { ...c, messages: [...c.messages, newMsg], subtitle: `You: ${text}`, time: 'now' }
          : c,
      ),
    )
    setComposer('')
    setReplyTo(null)

    try {
      await api.sendDemoMessage({
        chatId: currentChatId,
        text,
        clientOperationId: id,
        ...(currentReplyId ? { replyTo: currentReplyId } : {}),
      })
      updateStatus(id, 'sent', currentChatId)
      setTimeout(() => updateStatus(id, 'read', currentChatId), 1200)
    } catch {
      updateStatus(id, 'failed', currentChatId)
      return
    }

    // Simulate typing + reply only after the server acknowledges the demo send.
    if (selectedChat.kind === 'private') {
      setTimeout(() => {
        setChats((prev) => prev.map((c) => (c.id === selectedChat.id ? { ...c, typing: true } : c)))
      }, 1200)
      setTimeout(() => {
        const replies = [
          'Got it 👍',
          'Haha 😂',
          'Sounds great!',
          'Let me check and get back to you.',
          'Thanks for letting me know!',
          'On my way 🏃',
          'Perfect timing!',
          '🙌',
        ]
        const replyText = replies[Math.floor(Math.random() * replies.length)] ?? 'Got it 👍'
        const reply: Message = {
          id: 'r' + Date.now(),
          authorId: selectedChat.id,
          kind: 'text',
          text: replyText,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }
        setChats((prev) =>
          prev.map((c) =>
            c.id === selectedChat.id
              ? {
                  ...c,
                  typing: false,
                  messages: [...c.messages, reply],
                  subtitle: replyText,
                  time: 'now',
                  unread: 0,
                }
              : c,
          ),
        )
      }, 2800)
    }
  }

  const updateStatus = (
    msgId: string,
    status: 'sending' | 'sent' | 'read' | 'failed',
    chatId = selectedChat?.id,
  ) => {
    setChats((prev) =>
      prev.map((c) =>
        c.id === chatId
          ? { ...c, messages: c.messages.map((m) => (m.id === msgId ? { ...m, status } : m)) }
          : c,
      ),
    )
  }

  const onChatAction = (
    chatId: string,
    action: 'pin' | 'mute' | 'archive' | 'unread' | 'delete',
  ) => {
    setChats((prev) =>
      prev
        .map((c) => {
          if (c.id !== chatId) return c
          if (action === 'pin') return { ...c, pinned: !c.pinned }
          if (action === 'mute') return { ...c, muted: !c.muted }
          if (action === 'archive') return { ...c, archived: true }
          if (action === 'unread') return { ...c, unread: (c.unread ?? 0) + 1 }
          if (action === 'delete') return c
          return c
        })
        .filter((c) => !(action === 'delete' && c.id === chatId)),
    )
    if (action === 'delete' && selectedId === chatId) setSelectedId(null)
  }

  const pickEmoji = (e: string) => {
    setComposer((c) => c + e)
    setShowEmoji(false)
  }

  return (
    <div className="h-full w-full flex bg-slate-100 dark:bg-[#0b141a] overflow-hidden">
      {/* Desktop nav rail */}
      <div className="hidden md:flex flex-col w-16 bg-white dark:bg-[#111b21] border-r border-slate-200 dark:border-white/5 py-3 items-center gap-1">
        <button className="relative mb-2">
          <Avatar initials={me.initials} color={me.avatarColor} size={40} />
          <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[#111b21]" />
        </button>
        {[
          { icon: MessageCircle, label: 'Chats', active: true },
          { icon: Phone, label: 'Calls' },
          { icon: Users, label: 'Communities' },
          { icon: Bookmark, label: 'Saved' },
          { icon: ArchiveIcon, label: 'Archived' },
        ].map((n) => (
          <button
            key={n.label}
            className={`relative h-11 w-11 rounded-2xl flex items-center justify-center transition ${n.active ? 'bg-brand-50 dark:bg-brand-900/30 text-brand-600' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#1f2c33]'}`}
            title={n.label}
          >
            <n.icon className="h-5 w-5" />
            {n.active && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-brand-500" />
            )}
          </button>
        ))}
        <div className="flex-1" />
        <button
          onClick={toggleDark}
          className="h-11 w-11 rounded-2xl flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#1f2c33]"
          title="Toggle theme"
        >
          {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>
        <button
          onClick={() => setShowSettings(true)}
          className="h-11 w-11 rounded-2xl flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#1f2c33]"
          title="Settings"
        >
          <SettingsIcon className="h-5 w-5" />
        </button>
      </div>

      {/* Chat list column */}
      <div
        className={`flex flex-col bg-white dark:bg-[#111b21] border-r border-slate-200 dark:border-white/5 ${selectedChat ? 'hidden md:flex' : 'flex'} ${showInfo ? 'md:w-80 lg:w-96' : 'md:w-80 lg:w-[360px]'} w-full shrink-0`}
      >
        {/* Header */}
        <div className="h-16 px-4 flex items-center justify-between">
          <div className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
            Chats
            <span className="h-5 px-1.5 rounded-md bg-brand-500 text-white text-[10px] font-bold flex items-center justify-center">
              {chats.filter((c) => c.unread).length}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowSearch(true)}
              className="h-9 w-9 rounded-full hover:bg-slate-100 dark:hover:bg-[#1f2c33] text-slate-500 dark:text-slate-400 flex items-center justify-center"
              title="Global search"
            >
              <Search2 className="h-4 w-4" />
            </button>
            <button
              className="h-9 w-9 rounded-full hover:bg-slate-100 dark:hover:bg-[#1f2c33] text-slate-500 dark:text-slate-400 flex items-center justify-center"
              title="New chat"
            >
              <Plus className="h-4 w-4" />
            </button>
            <button
              onClick={toggleDark}
              className="md:hidden h-9 w-9 rounded-full hover:bg-slate-100 dark:hover:bg-[#1f2c33] text-slate-500 dark:text-slate-400 flex items-center justify-center"
            >
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="px-3 pb-2">
          <div className="relative">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search chats or messages"
              className="w-full h-9 pl-9 pr-9 rounded-full bg-slate-100 dark:bg-[#202c33] text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-brand-500"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full hover:bg-slate-200 dark:hover:bg-[#2a3942] flex items-center justify-center text-slate-400"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Filter tabs */}
        <div className="px-3 pb-2 flex gap-1.5 overflow-x-auto slim-scroll">
          {[
            { id: 'all', label: 'All' },
            { id: 'unread', label: 'Unread' },
            { id: 'private', label: 'Personal' },
            { id: 'groups', label: 'Groups' },
            { id: 'channels', label: 'Channels' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id as Filter)}
              className={`h-7 px-3 rounded-full text-xs font-medium whitespace-nowrap transition ${
                filter === f.id
                  ? 'bg-brand-500 text-white'
                  : 'bg-slate-100 dark:bg-[#202c33] text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#2a3942]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Chat list */}
        <div className="flex-1 overflow-y-auto slim-scroll">
          {filteredChats.length === 0 && (
            <div className="text-center py-12 px-6">
              <div className="mx-auto h-12 w-12 rounded-full bg-slate-100 dark:bg-[#1f2c33] flex items-center justify-center mb-3">
                <Search2 className="h-5 w-5 text-slate-400" />
              </div>
              <div className="text-sm font-medium text-slate-700 dark:text-slate-200">
                No chats found
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Try a different filter or search.
              </div>
            </div>
          )}
          {filteredChats.map((c) => (
            <ChatRow
              key={c.id}
              chat={c}
              active={c.id === selectedId}
              onClick={() => setSelectedId(c.id)}
              onContext={(e) => {
                e.preventDefault()
                setMenu({
                  x: Math.min(e.clientX, window.innerWidth - 220),
                  y: Math.min(e.clientY, window.innerHeight - 240),
                  chatId: c.id,
                })
              }}
            />
          ))}
          <div className="h-4" />
        </div>
      </div>

      {/* Conversation column */}
      <div className={`flex-1 flex flex-col min-w-0 ${selectedChat ? 'flex' : 'hidden md:flex'}`}>
        {selectedChat ? (
          <Conversation
            chat={selectedChat}
            dark={dark}
            onBack={() => setSelectedId(null)}
            onOpenInfo={() => setShowInfo(true)}
            composer={composer}
            setComposer={setComposer}
            onSend={() => sendMessage(composer)}
            showEmoji={showEmoji}
            setShowEmoji={setShowEmoji}
            showAttach={showAttach}
            setShowAttach={setShowAttach}
            pickEmoji={pickEmoji}
            replyTo={replyTo}
            cancelReply={() => setReplyTo(null)}
            setReplyTo={setReplyTo}
            scrollRef={scrollRef}
            onMediaClick={(url) => setMediaUrl(url)}
          />
        ) : (
          <EmptyConversation />
        )}
      </div>

      {/* Info panel */}
      {showInfo && selectedChat && (
        <div
          className={`hidden lg:block w-80 xl:w-96 border-l border-slate-200 dark:border-white/5 ${dark ? '' : ''}`}
        >
          <ContactInfo chat={selectedChat} onClose={() => setShowInfo(false)} dark={dark} />
        </div>
      )}
      {showInfo && selectedChat && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowInfo(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-[88%] max-w-sm">
            <ContactInfo chat={selectedChat} onClose={() => setShowInfo(false)} dark={dark} />
          </div>
        </div>
      )}

      {/* Settings */}
      {showSettings && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowSettings(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-full sm:w-[420px]">
            <Settings onClose={() => setShowSettings(false)} dark={dark} toggleDark={toggleDark} />
            <div className="absolute bottom-4 left-4 right-4">
              <button
                onClick={onLogout}
                className="w-full h-10 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white text-sm font-medium"
              >
                Sign out & return to login
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global search */}
      {showSearch && (
        <GlobalSearch
          chats={chats}
          onClose={() => setShowSearch(false)}
          onOpen={(id) => {
            setSelectedId(id)
            setShowSearch(false)
          }}
        />
      )}

      {/* Media viewer */}
      {mediaUrl && <MediaViewer url={mediaUrl} onClose={() => setMediaUrl(null)} />}

      {/* Context menu */}
      {menu && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          onClose={() => setMenu(null)}
          onPin={() => onChatAction(menu.chatId, 'pin')}
          onMute={() => onChatAction(menu.chatId, 'mute')}
          onArchive={() => onChatAction(menu.chatId, 'archive')}
          onUnread={() => onChatAction(menu.chatId, 'unread')}
          onDelete={() => onChatAction(menu.chatId, 'delete')}
        />
      )}
    </div>
  )
}

/* ---------------- Chat row ---------------- */
function ChatRow({
  chat,
  active,
  onClick,
  onContext,
}: {
  chat: Chat
  active: boolean
  onClick: () => void
  onContext: (e: React.MouseEvent) => void
}) {
  return (
    <button
      onClick={onClick}
      onContextMenu={onContext}
      className={`w-full flex items-center gap-3 px-3 py-2.5 transition text-left ${
        active ? 'bg-brand-50 dark:bg-brand-900/20' : 'hover:bg-slate-50 dark:hover:bg-[#1f2c33]'
      }`}
    >
      <Avatar initials={chat.initials} color={chat.avatarColor} size={48} online={chat.online} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="flex-1 flex items-center gap-1 min-w-0">
            <span className="font-semibold text-sm text-slate-900 dark:text-white truncate">
              {chat.name}
            </span>
            {chat.verified && <BadgeCheck className="h-3.5 w-3.5 text-brand-500 shrink-0" />}
          </div>
          <span
            className={`text-[11px] shrink-0 ${chat.unread ? 'text-brand-600 font-semibold' : 'text-slate-400 dark:text-slate-500'}`}
          >
            {chat.time}
          </span>
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          {chat.typing ? (
            <div className="flex items-center gap-1 text-brand-600 text-sm font-medium">
              <span className="typing-dot h-1.5 w-1.5 rounded-full bg-brand-500 inline-block" />
              <span className="typing-dot h-1.5 w-1.5 rounded-full bg-brand-500 inline-block" />
              <span className="typing-dot h-1.5 w-1.5 rounded-full bg-brand-500 inline-block" />
              <span className="ml-1">typing…</span>
            </div>
          ) : (
            <span
              className={`text-xs truncate ${chat.unread ? 'text-slate-700 dark:text-slate-200 font-medium' : 'text-slate-500 dark:text-slate-400'}`}
            >
              {chat.subtitle}
            </span>
          )}
          <div className="ml-auto flex items-center gap-1 shrink-0">
            {chat.pinned && <Pin className="h-3 w-3 text-slate-400 rotate-45" />}
            {chat.muted && <BellOff className="h-3 w-3 text-slate-400" />}
            {chat.unread ? (
              <span className="h-5 min-w-5 px-1.5 rounded-full bg-brand-500 text-white text-[10px] font-bold flex items-center justify-center">
                {chat.unread}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </button>
  )
}

/* ---------------- Conversation ---------------- */
function Conversation({
  chat,
  dark,
  onBack,
  onOpenInfo,
  composer,
  setComposer,
  onSend,
  showEmoji,
  setShowEmoji,
  showAttach,
  setShowAttach,
  pickEmoji,
  replyTo,
  cancelReply,
  setReplyTo,
  scrollRef,
  onMediaClick,
}: {
  chat: Chat
  dark: boolean
  onBack: () => void
  onOpenInfo: () => void
  composer: string
  setComposer: (v: string) => void
  onSend: () => void
  showEmoji: boolean
  setShowEmoji: (v: boolean) => void
  showAttach: boolean
  setShowAttach: (v: boolean) => void
  pickEmoji: (e: string) => void
  replyTo: Message | null
  cancelReply: () => void
  setReplyTo: (m: Message) => void
  scrollRef: React.RefObject<HTMLDivElement | null>
  onMediaClick: (url: string) => void
}) {
  return (
    <>
      {/* Header */}
      <div className="h-14 px-3 flex items-center gap-3 bg-white dark:bg-[#202c33] border-b border-slate-200 dark:border-white/5 shrink-0">
        <button
          onClick={onBack}
          className="md:hidden h-9 w-9 rounded-full hover:bg-slate-100 dark:hover:bg-[#2a3942] flex items-center justify-center text-slate-600 dark:text-slate-300"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <button onClick={onOpenInfo} className="flex items-center gap-3 flex-1 min-w-0">
          <Avatar
            initials={chat.initials}
            color={chat.avatarColor}
            size={36}
            online={chat.online}
          />
          <div className="text-left flex-1 min-w-0">
            <div className="flex items-center gap-1">
              <span className="font-semibold text-sm text-slate-900 dark:text-white truncate">
                {chat.name}
              </span>
              {chat.verified && <BadgeCheck className="h-3.5 w-3.5 text-brand-500" />}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
              {chat.typing ? (
                <span className="text-brand-600 font-medium flex items-center gap-1">
                  typing
                  <span className="typing-dot h-1 w-1 rounded-full bg-brand-500 inline-block" />
                  <span className="typing-dot h-1 w-1 rounded-full bg-brand-500 inline-block" />
                  <span className="typing-dot h-1 w-1 rounded-full bg-brand-500 inline-block" />
                </span>
              ) : chat.kind === 'private' ? (
                chat.online ? (
                  'online'
                ) : (
                  'last seen today at 08:42'
                )
              ) : chat.kind === 'group' ? (
                `${chat.members} members, 3 online`
              ) : (
                `${chat.members?.toLocaleString()} subscribers`
              )}
            </div>
          </div>
        </button>
        <div className="flex items-center gap-1">
          <button className="h-9 w-9 rounded-full hover:bg-slate-100 dark:hover:bg-[#2a3942] flex items-center justify-center text-slate-500 dark:text-slate-400">
            <Video className="h-4 w-4" />
          </button>
          <button className="h-9 w-9 rounded-full hover:bg-slate-100 dark:hover:bg-[#2a3942] flex items-center justify-center text-slate-500 dark:text-slate-400">
            <Phone className="h-4 w-4" />
          </button>
          <button className="h-9 w-9 rounded-full hover:bg-slate-100 dark:hover:bg-[#2a3942] flex items-center justify-center text-slate-500 dark:text-slate-400">
            <Search2 className="h-4 w-4" />
          </button>
          <button
            onClick={onOpenInfo}
            className="h-9 w-9 rounded-full hover:bg-slate-100 dark:hover:bg-[#2a3942] flex items-center justify-center text-slate-500 dark:text-slate-400"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className={`flex-1 overflow-y-auto slim-scroll px-4 sm:px-10 lg:px-20 py-4 ${dark ? 'chat-bg-dark' : 'chat-bg-light'}`}
      >
        <div className="max-w-3xl mx-auto space-y-1">
          {chat.messages.map((m, i) => (
            <MessageBubble
              key={m.id}
              message={m}
              prev={chat.messages[i - 1]}
              next={chat.messages[i + 1]}
              chat={chat}
              onReply={() => setReplyTo(m)}
              onMediaClick={onMediaClick}
            />
          ))}
          {chat.typing && <TypingBubble />}
        </div>
      </div>

      {/* Composer */}
      <div className="bg-white dark:bg-[#202c33] border-t border-slate-200 dark:border-white/5 px-2 sm:px-4 py-2 shrink-0 relative">
        {showEmoji && (
          <div className="absolute bottom-full left-2 mb-2 z-20">
            <EmojiPicker onPick={pickEmoji} onClose={() => setShowEmoji(false)} />
          </div>
        )}
        {showAttach && (
          <div className="absolute bottom-full left-10 mb-2 z-20 bg-white dark:bg-[#233138] rounded-2xl shadow-2xl ring-1 ring-slate-200 dark:ring-white/10 p-2 animate-fade-in">
            <div className="grid grid-cols-3 gap-2">
              {[
                { icon: ImageIcon, label: 'Photos', color: 'bg-violet-500' },
                { icon: Camera, label: 'Camera', color: 'bg-rose-500' },
                { icon: FileIcon, label: 'Document', color: 'bg-indigo-500' },
                { icon: UserPlus, label: 'Contact', color: 'bg-sky-500' },
                { icon: Hash, label: 'Poll', color: 'bg-amber-500' },
                { icon: Archive, label: 'Location', color: 'bg-emerald-500' },
              ].map((a) => (
                <button
                  key={a.label}
                  onClick={() => setShowAttach(false)}
                  className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-[#1f2c33] transition"
                >
                  <div
                    className={`h-11 w-11 rounded-full ${a.color} flex items-center justify-center text-white shadow-lg`}
                  >
                    <a.icon className="h-5 w-5" />
                  </div>
                  <span className="text-[11px] text-slate-600 dark:text-slate-300">{a.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {replyTo && (
          <div className="flex items-center gap-2 pl-2 pr-3 py-2 mb-2 border-l-4 border-brand-500 bg-brand-50 dark:bg-brand-900/20 rounded-r-xl animate-fade-in">
            <Reply className="h-4 w-4 text-brand-500" />
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-semibold text-brand-600">
                Reply to{' '}
                {replyTo.authorId
                  ? people[replyTo.authorId as keyof typeof people]?.name
                  : 'yourself'}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {replyTo.text || replyTo.kind}
              </div>
            </div>
            <button
              onClick={cancelReply}
              className="h-7 w-7 rounded-full hover:bg-slate-200 dark:hover:bg-[#2a3942] flex items-center justify-center"
            >
              <X className="h-3.5 w-3.5 text-slate-500" />
            </button>
          </div>
        )}

        <div className="flex items-end gap-1 sm:gap-2">
          <button
            onClick={() => {
              setShowEmoji(!showEmoji)
              setShowAttach(false)
            }}
            className={`h-10 w-10 rounded-full flex items-center justify-center transition ${showEmoji ? 'text-brand-500' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#2a3942]'}`}
          >
            <Smile className="h-5 w-5" />
          </button>
          <button
            onClick={() => {
              setShowAttach(!showAttach)
              setShowEmoji(false)
            }}
            className={`h-10 w-10 rounded-full flex items-center justify-center transition ${showAttach ? 'text-brand-500' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#2a3942]'}`}
          >
            <Paperclip className="h-5 w-5" />
          </button>
          <div className="flex-1 min-w-0">
            <textarea
              value={composer}
              onChange={(e) => setComposer(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  onSend()
                }
              }}
              placeholder="Type a message"
              rows={1}
              className="w-full max-h-32 resize-none px-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-[#2a3942] text-sm text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          {composer.trim() ? (
            <button
              onClick={onSend}
              className="h-10 w-10 rounded-full bg-brand-500 hover:bg-brand-600 text-white flex items-center justify-center shadow-lg shadow-brand-500/30 transition active:scale-95"
            >
              <Send className="h-4 w-4" />
            </button>
          ) : (
            <button className="h-10 w-10 rounded-full bg-brand-500 hover:bg-brand-600 text-white flex items-center justify-center shadow-lg shadow-brand-500/30 transition">
              <Mic className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </>
  )
}

/* ---------------- Message bubble ---------------- */
function MessageBubble({
  message,
  prev,
  next,
  chat,
  onReply,
  onMediaClick,
}: {
  message: Message
  prev?: Message
  next?: Message
  chat: Chat
  onReply: () => void
  onMediaClick: (url: string) => void
}) {
  if (message.kind === 'system') {
    return (
      <div className="flex justify-center py-3">
        <div className="px-3 py-1 rounded-full bg-white/80 dark:bg-[#202c33]/80 text-[11px] text-slate-500 dark:text-slate-400 font-medium shadow-sm">
          {message.text}
        </div>
      </div>
    )
  }

  const outgoing = !message.authorId
  const showTail = !next || next.authorId !== message.authorId || next.kind === 'system'
  const author = message.authorId ? people[message.authorId as keyof typeof people] : null
  const showAuthor =
    !outgoing &&
    (chat.kind === 'group' || chat.kind === 'channel') &&
    (!prev || prev.authorId !== message.authorId || prev.kind === 'system')

  if (message.kind === 'sticker') {
    return (
      <div className={`flex ${outgoing ? 'justify-end' : 'justify-start'} mb-1 animate-bubble`}>
        <div className="text-7xl leading-none px-1">{message.emoji}</div>
      </div>
    )
  }

  return (
    <div className={`flex ${outgoing ? 'justify-end' : 'justify-start'} group animate-bubble`}>
      <div
        className={`relative max-w-[80%] sm:max-w-md rounded-2xl px-3 py-1.5 shadow-sm ${
          outgoing
            ? `bg-brand-100 dark:bg-[#005c4b] text-slate-900 dark:text-white ${showTail ? 'rounded-br-md' : ''}`
            : `bg-white dark:bg-[#202c33] text-slate-900 dark:text-white ${showTail ? 'rounded-bl-md' : ''}`
        }`}
      >
        {showAuthor && author && (
          <div
            className={`text-xs font-semibold mb-0.5 bg-gradient-to-r ${author.avatarColor} bg-clip-text text-transparent`}
          >
            {author.name}
          </div>
        )}

        {/* Reply quote */}
        {message.kind === 'reply' && message.replyTo && (
          <div className="mb-1 pl-2 border-l-4 border-brand-500 bg-white/40 dark:bg-white/5 rounded px-2 py-1 text-xs">
            <div className="text-brand-600 font-semibold">You</div>
            <div className="text-slate-600 dark:text-slate-300 truncate">
              Tap to view quoted message
            </div>
          </div>
        )}

        {message.kind === 'image' && message.mediaUrl && (
          <button
            onClick={() => onMediaClick(message.mediaUrl!)}
            className="block mb-1 -mx-1 -mt-1 rounded-xl overflow-hidden"
          >
            <img src={message.mediaUrl} alt="media" className="w-full max-h-72 object-cover" />
          </button>
        )}
        {message.kind === 'video' && message.mediaUrl && (
          <button
            onClick={() => onMediaClick(message.mediaUrl!)}
            className="relative block mb-1 -mx-1 -mt-1 rounded-xl overflow-hidden"
          >
            <img src={message.mediaUrl} alt="video" className="w-full max-h-72 object-cover" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-12 w-12 rounded-full bg-black/50 backdrop-blur flex items-center justify-center">
                <Play className="h-5 w-5 text-white ml-0.5" />
              </div>
            </div>
            {message.duration && (
              <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/60 text-white text-[10px] font-semibold">
                {message.duration}
              </div>
            )}
          </button>
        )}
        {message.kind === 'document' && (
          <div className="flex items-center gap-3 bg-white/40 dark:bg-white/5 rounded-xl p-2.5 mb-1 -mt-0.5">
            <div className="h-10 w-10 rounded-lg bg-rose-500 flex items-center justify-center text-white">
              <FileText className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{message.fileName}</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                {message.fileSize} · PDF
              </div>
            </div>
          </div>
        )}
        {message.kind === 'voice' && (
          <div className="flex items-center gap-2.5 py-1 min-w-[220px]">
            <button className="h-8 w-8 rounded-full bg-brand-500 text-white flex items-center justify-center shrink-0">
              <Play className="h-3.5 w-3.5 ml-0.5" />
            </button>
            <div className="flex-1 flex items-center gap-0.5">
              {Array.from({ length: 28 }).map((_, i) => (
                <div
                  key={i}
                  className="w-0.5 rounded-full bg-brand-600/60 dark:bg-brand-300/60"
                  style={{ height: `${6 + Math.abs(Math.sin(i * 0.8)) * 16}px` }}
                />
              ))}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">{message.duration}</div>
          </div>
        )}
        {(message.kind === 'text' || message.kind === 'reply') && (
          <div className="text-sm whitespace-pre-wrap break-words leading-snug pr-14">
            {message.text}
          </div>
        )}
        {message.kind === 'image' && message.text && (
          <div className="text-sm mt-1 pr-14">{message.text}</div>
        )}

        {/* Meta */}
        <div
          className={`flex items-center gap-1 justify-end ${message.kind === 'voice' || message.kind === 'document' || message.kind === 'image' || message.kind === 'video' ? 'absolute bottom-1.5 right-2.5' : '-mt-3 pt-1'}`}
        >
          <span className="text-[10px] text-slate-500 dark:text-slate-400">{message.time}</span>
          {outgoing && <StatusIcon status={message.status} />}
        </div>

        {/* Hover reply button */}
        <button
          onClick={onReply}
          className="absolute -top-2 right-2 h-7 w-7 rounded-full bg-white dark:bg-[#202c33] shadow ring-1 ring-slate-200 dark:ring-white/10 items-center justify-center text-slate-500 hidden group-hover:flex"
          title="Reply"
        >
          <Reply className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}

/* ---------------- Typing indicator ---------------- */
function TypingBubble() {
  return (
    <div className="flex justify-start mb-1 animate-fade-in">
      <div className="bg-white dark:bg-[#202c33] rounded-2xl rounded-bl-md px-4 py-3 shadow-sm flex items-center gap-1.5">
        <span className="typing-dot h-2 w-2 rounded-full bg-slate-400 inline-block" />
        <span className="typing-dot h-2 w-2 rounded-full bg-slate-400 inline-block" />
        <span className="typing-dot h-2 w-2 rounded-full bg-slate-400 inline-block" />
      </div>
    </div>
  )
}

/* ---------------- Empty state ---------------- */
function EmptyConversation() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 dark:bg-[#222e35] text-center px-6">
      <div className="h-24 w-24 rounded-3xl bg-gradient-to-br from-brand-400 to-brand-700 flex items-center justify-center shadow-2xl shadow-brand-500/30 mb-5">
        <MessageCircle className="h-11 w-11 text-white" />
      </div>
      <h3 className="text-2xl font-bold text-slate-800 dark:text-white">Teletalk Web</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-sm">
        Send and receive messages securely. Select a chat on the left or start a new conversation to
        begin.
      </p>
      <div className="mt-8 flex items-center gap-1 text-[11px] text-slate-400 dark:text-slate-500">
        <span className="inline-flex items-center gap-1">
          <Command className="h-3 w-3" />K to search
        </span>
        <span className="mx-2">·</span>
        <span>🔒 End-to-end encrypted</span>
      </div>
    </div>
  )
}

/* ---------------- Global search ---------------- */
function GlobalSearch({
  chats,
  onClose,
  onOpen,
}: {
  chats: Chat[]
  onClose: () => void
  onOpen: (id: string) => void
}) {
  const [q, setQ] = useState('')
  const results = useMemo(() => {
    if (!q) return []
    const lq = q.toLowerCase()
    const out: Array<{ chat: Chat; message?: Message; match: string }> = []
    for (const c of chats) {
      if (c.name.toLowerCase().includes(lq)) out.push({ chat: c, match: c.name })
      for (const m of c.messages) {
        if (m.text && m.text.toLowerCase().includes(lq)) {
          out.push({ chat: c, message: m, match: m.text })
        }
      }
    }
    return out.slice(0, 12)
  }, [q, chats])

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm flex items-start justify-center pt-20 px-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl bg-white dark:bg-[#202c33] rounded-2xl shadow-2xl ring-1 ring-slate-200 dark:ring-white/10 overflow-hidden"
      >
        <div className="flex items-center gap-3 p-4 border-b border-slate-100 dark:border-white/5">
          <Search className="h-5 w-5 text-slate-400" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search messages, people, files…"
            className="flex-1 bg-transparent text-slate-900 dark:text-white placeholder:text-slate-400 outline-none"
          />
          <kbd className="hidden sm:inline-flex h-6 px-1.5 rounded bg-slate-100 dark:bg-[#2a3942] text-[10px] font-semibold text-slate-500 items-center">
            ESC
          </kbd>
        </div>
        <div className="max-h-96 overflow-y-auto slim-scroll">
          {q && results.length === 0 && (
            <div className="p-10 text-center text-sm text-slate-500">No results for "{q}"</div>
          )}
          {!q && (
            <div className="p-6 text-center text-xs text-slate-500 dark:text-slate-400">
              Start typing to search across all chats and messages.
            </div>
          )}
          {results.map((r, i) => (
            <button
              key={i}
              onClick={() => onOpen(r.chat.id)}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-[#1f2c33] text-left"
            >
              <Avatar initials={r.chat.initials} color={r.chat.avatarColor} size={36} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                  {r.chat.name}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {r.message ? r.message.text : 'Chat'}
                </div>
              </div>
              {r.message && <span className="text-[10px] text-slate-400">{r.message.time}</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
