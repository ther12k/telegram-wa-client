export type ChatKind = 'private' | 'group' | 'channel'

export type Message = {
  id: string
  authorId?: string // undefined = me (outgoing)
  kind: 'text' | 'image' | 'video' | 'document' | 'voice' | 'sticker' | 'system' | 'reply'
  text?: string
  time: string
  status?: 'sending' | 'sent' | 'read' | 'failed'
  replyTo?: string // id of quoted message
  mediaUrl?: string
  mediaId?: string
  mediaMime?: string
  mediaName?: string
  mediaSize?: number
  mediaDuration?: number
  fileName?: string
  fileSize?: string
  duration?: string // for voice/video
  emoji?: string // for sticker
}

export type Chat = {
  id: string
  name: string
  kind: ChatKind
  avatarColor: string
  initials: string
  subtitle: string // last message preview / status
  time: string
  unread?: number
  muted?: boolean
  pinned?: boolean
  archived?: boolean
  online?: boolean
  members?: number
  verified?: boolean
  typing?: boolean
  messages: Message[]
}

export const me = {
  id: 'me',
  name: 'You',
  initials: 'YO',
  avatarColor: 'from-emerald-400 to-teal-600',
}

type PersonProfile = {
  name: string
  initials: string
  avatarColor: string
  about: string
  phone: string
}

type PeopleKey = 'alice' | 'priya' | 'carlos' | 'mom' | 'sarah' | 'oliver' | 'nina' | 'leo'

export const people: Record<PeopleKey, PersonProfile> = {
  alice: {
    name: 'Alice Chen',
    initials: 'AC',
    avatarColor: 'from-rose-400 to-pink-600',
    about: 'Designing the future 🎨',
    phone: '+1 415 555 0142',
  },
  priya: {
    name: 'Priya Raman',
    initials: 'PR',
    avatarColor: 'from-amber-400 to-orange-600',
    about: 'Code · Coffee · Repeat ☕',
    phone: '+44 20 7946 0321',
  },
  carlos: {
    name: 'Carlos Rodríguez',
    initials: 'CR',
    avatarColor: 'from-sky-400 to-indigo-600',
    about: 'Available',
    phone: '+34 612 345 678',
  },
  mom: {
    name: 'Mom ❤️',
    initials: 'M',
    avatarColor: 'from-fuchsia-400 to-purple-600',
    about: 'Call me when you can 💕',
    phone: '+1 212 555 7788',
  },
  sarah: {
    name: 'Sarah Kim',
    initials: 'SK',
    avatarColor: 'from-teal-400 to-emerald-600',
    about: 'On a flight ✈️',
    phone: '+82 10 1234 5678',
  },
  oliver: {
    name: 'Oliver Bennett',
    initials: 'OB',
    avatarColor: 'from-lime-400 to-green-600',
    about: 'Living the slow life 🌿',
    phone: '+61 4 1234 5678',
  },
  nina: {
    name: 'Nina Okafor',
    initials: 'NO',
    avatarColor: 'from-violet-400 to-purple-600',
    about: 'Product at Northwind',
    phone: '+234 802 345 6789',
  },
  leo: {
    name: 'Leo Moretti',
    initials: 'LM',
    avatarColor: 'from-cyan-400 to-blue-600',
    about: 'Photography · Travel',
    phone: '+39 333 123 4567',
  },
}

export const chats: Chat[] = [
  {
    id: 'alice',
    name: 'Alice Chen',
    kind: 'private',
    avatarColor: people.alice!.avatarColor,
    initials: people.alice!.initials,
    subtitle: 'See you tomorrow! 😊',
    time: '10:42',
    unread: 2,
    pinned: true,
    online: true,
    messages: [
      { id: 'm1', kind: 'system', text: 'Today', time: '' },
      {
        id: 'm2',
        authorId: 'alice',
        kind: 'text',
        text: 'Hey! Did you check the new mockups I sent last night?',
        time: '09:15',
      },
      {
        id: 'm3',
        kind: 'text',
        text: 'Just opened them — the layout feels way more balanced now 👏',
        time: '09:18',
        status: 'read',
      },
      {
        id: 'm4',
        authorId: 'alice',
        kind: 'image',
        text: "Here's the updated hero section",
        time: '09:22',
        mediaUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80',
      },
      {
        id: 'm5',
        kind: 'reply',
        replyTo: 'm4',
        text: 'Love the gradient! Can we try a darker variant too?',
        time: '09:24',
        status: 'read',
      },
      { id: 'm6', authorId: 'alice', kind: 'voice', duration: '0:42', time: '09:30' },
      {
        id: 'm7',
        kind: 'text',
        text: 'Got it — sending a darker option in 5',
        time: '09:31',
        status: 'read',
      },
      { id: 'm8', authorId: 'alice', kind: 'sticker', emoji: '🎉', time: '09:32' },
      { id: 'm9', kind: 'text', text: 'See you tomorrow! 😊', time: '10:42', status: 'sent' },
    ],
  },
  {
    id: 'devteam',
    name: 'Dev Team',
    kind: 'group',
    avatarColor: 'from-indigo-500 to-blue-700',
    initials: 'DT',
    subtitle: 'Priya: The deployment is ready 🚀',
    time: '10:21',
    unread: 5,
    members: 8,
    messages: [
      { id: 'g1', kind: 'system', text: 'Priya added you to this group', time: '' },
      {
        id: 'g2',
        authorId: 'priya',
        kind: 'text',
        text: 'Morning team! Quick standup at 10?',
        time: '08:55',
      },
      { id: 'g3', authorId: 'carlos', kind: 'text', text: 'On it 👍', time: '08:56' },
      {
        id: 'g4',
        authorId: 'nina',
        kind: 'document',
        fileName: 'Sprint-24-Plan.pdf',
        fileSize: '2.4 MB',
        time: '09:02',
      },
      {
        id: 'g5',
        authorId: 'priya',
        kind: 'text',
        text: 'The deployment is ready 🚀',
        time: '10:21',
      },
      {
        id: 'g6',
        authorId: 'carlos',
        kind: 'text',
        text: 'Testing now. Will update in 20 min.',
        time: '10:22',
      },
    ],
  },
  {
    id: 'technews',
    name: 'Tech Pulse',
    kind: 'channel',
    avatarColor: 'from-zinc-700 to-zinc-900',
    initials: 'TP',
    subtitle: 'Breaking: new open-source model tops MMLU',
    time: '09:58',
    unread: 12,
    verified: true,
    members: 148230,
    messages: [
      { id: 'c1', kind: 'system', text: 'Channel · 148,230 subscribers', time: '' },
      {
        id: 'c2',
        kind: 'image',
        text: 'Breaking: new open-source model tops MMLU benchmarks with a 91.3% score.',
        time: '09:58',
        mediaUrl: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&q=80',
      },
    ],
  },
  {
    id: 'mom',
    name: 'Mom ❤️',
    kind: 'private',
    avatarColor: people.mom!.avatarColor,
    initials: people.mom!.initials,
    subtitle: '🎙 Voice message (0:18)',
    time: '09:01',
    online: false,
    messages: [
      {
        id: 'mm1',
        authorId: 'mom',
        kind: 'text',
        text: "Don't forget Sunday lunch!",
        time: '08:55',
      },
      { id: 'mm2', authorId: 'mom', kind: 'voice', duration: '0:18', time: '09:01' },
    ],
  },
  {
    id: 'sarah',
    name: 'Sarah Kim',
    kind: 'private',
    avatarColor: people.sarah!.avatarColor,
    initials: people.sarah!.initials,
    subtitle: 'typing…',
    time: 'Yesterday',
    typing: true,
    messages: [
      { id: 's1', kind: 'system', text: 'Yesterday', time: '' },
      {
        id: 's2',
        authorId: 'sarah',
        kind: 'text',
        text: 'Can you review my pull request when you get a chance?',
        time: '18:12',
      },
      { id: 's3', kind: 'text', text: 'Absolutely — looking now', time: '18:20', status: 'read' },
    ],
  },
  {
    id: 'family',
    name: 'Family',
    kind: 'group',
    avatarColor: 'from-pink-400 to-rose-600',
    initials: 'FM',
    subtitle: '📷 Photo',
    time: 'Yesterday',
    members: 6,
    muted: true,
    messages: [
      { id: 'f1', kind: 'system', text: 'Yesterday', time: '' },
      {
        id: 'f2',
        authorId: 'mom',
        kind: 'image',
        text: "From grandma's garden 🌸",
        time: '16:04',
        mediaUrl: 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=800&q=80',
      },
    ],
  },
  {
    id: 'carlos',
    name: 'Carlos Rodríguez',
    kind: 'private',
    avatarColor: people.carlos!.avatarColor,
    initials: people.carlos!.initials,
    subtitle: '🎉 Sticker',
    time: 'Mon',
    messages: [
      { id: 'ca1', kind: 'system', text: 'Monday', time: '' },
      { id: 'ca2', authorId: 'carlos', kind: 'sticker', emoji: '🔥', time: '14:02' },
      { id: 'ca3', kind: 'text', text: 'Classic Carlos 😂', time: '14:05', status: 'read' },
    ],
  },
  {
    id: 'design',
    name: 'Design Daily',
    kind: 'channel',
    avatarColor: 'from-orange-500 to-red-600',
    initials: 'DD',
    subtitle: 'Minimal interfaces: 12 references to bookmark',
    time: 'Mon',
    verified: true,
    members: 42109,
    messages: [
      { id: 'd1', kind: 'system', text: 'Channel · 42,109 subscribers', time: '' },
      {
        id: 'd2',
        kind: 'video',
        text: 'Minimal interfaces: 12 references to bookmark',
        duration: '2:14',
        time: '11:40',
        mediaUrl: 'https://images.unsplash.com/photo-1558655146-9f40138edfeb?w=800&q=80',
      },
    ],
  },
  {
    id: 'oliver',
    name: 'Oliver Bennett',
    kind: 'private',
    avatarColor: people.oliver!.avatarColor,
    initials: people.oliver!.initials,
    subtitle: 'You: Sure thing 👌',
    time: 'Sun',
    messages: [
      {
        id: 'o1',
        authorId: 'oliver',
        kind: 'text',
        text: 'Free for coffee Sunday?',
        time: 'Sat 15:00',
      },
      { id: 'o2', kind: 'text', text: 'Sure thing 👌', time: 'Sun 10:11', status: 'read' },
    ],
  },
  {
    id: 'leo',
    name: 'Leo Moretti',
    kind: 'private',
    avatarColor: people.leo!.avatarColor,
    initials: people.leo!.initials,
    subtitle: 'Message failed to send',
    time: 'Sat',
    messages: [
      {
        id: 'l1',
        kind: 'text',
        text: 'Hey Leo — are we still meeting Saturday?',
        time: 'Sat 09:12',
        status: 'failed',
      },
    ],
  },
  {
    id: 'nina',
    name: 'Nina Okafor',
    kind: 'private',
    avatarColor: people.nina!.avatarColor,
    initials: people.nina!.initials,
    subtitle: 'Thanks! Talk soon 🙌',
    time: 'Fri',
    messages: [
      {
        id: 'n1',
        authorId: 'nina',
        kind: 'text',
        text: 'Sent the contract over ✍️',
        time: 'Fri 17:02',
      },
      { id: 'n2', kind: 'text', text: 'Thanks! Talk soon 🙌', time: 'Fri 17:15', status: 'read' },
    ],
  },
]

export const emojiGroups = [
  {
    name: 'Smileys',
    items: [
      '😀',
      '😁',
      '😂',
      '🤣',
      '😊',
      '😍',
      '😘',
      '🥰',
      '😎',
      '🤩',
      '🥳',
      '😇',
      '🤔',
      '🤗',
      '🫡',
      '😴',
      '🤯',
      '🥺',
      '😭',
      '😤',
      '🙄',
      '😬',
    ],
  },
  {
    name: 'Gestures',
    items: ['👍', '👎', '👏', '🙌', '🤝', '✌️', '🤞', '🫶', '💪', '🙏', '👀', '🫠'],
  },
  {
    name: 'Hearts',
    items: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🤍', '🖤', '💔', '💖', '💕', '💞'],
  },
  {
    name: 'Objects',
    items: [
      '🎉',
      '🔥',
      '✨',
      '⭐',
      '🚀',
      '💡',
      '🎨',
      '📚',
      '☕',
      '🍕',
      '🎵',
      '📷',
      '⚡',
      '🌿',
      '🌸',
    ],
  },
]
