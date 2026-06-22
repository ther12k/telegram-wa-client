import type { Dialog, DialogList, LastMessage, Peer } from '@telewa/contracts'
import type { TelegramClient } from '@mtcute/node'

/**
 * Minimal typed interface over the subset of mtcute's TelegramClient
 * methods used by the providers. mtcute 0.8.0 attaches most of its
 * high-level methods to `TelegramClient.prototype` at runtime but does
 * not re-declare them in the .d.ts type. Defining them here keeps the
 * providers type-safe AND lets unit tests inject a small fake without
 * pulling in the whole mtcute runtime.
 *
 * The shape mirrors mtcute's actual runtime behavior (returns, params).
 * If mtcute changes a signature we update this surface and the mock.
 */
export interface MtcuteClientSurface {
  getMe(): Promise<MtcuteUser>
  iterDialogs(params?: { limit?: number }): AsyncIterable<MtcuteDialog>
  getHistory(
    chatId: MtcuteInputPeerLike,
    params?: { limit?: number; offsetId?: number },
  ): Promise<MtcuteMessage[]>
  sendText(
    chatId: MtcuteInputPeerLike,
    text: string,
    params?: { replyTo?: number },
  ): Promise<MtcuteMessage>
  readHistory(chatId: MtcuteInputPeerLike): Promise<void>
  searchGlobal(params: { q: string; limit?: number }): Promise<MtcuteMessage[]>
  searchMessages(
    chatId: MtcuteInputPeerLike,
    params: { q: string; limit?: number },
  ): Promise<MtcuteMessage[]>
  deleteHistory(
    chatId: MtcuteInputPeerLike,
    params?: { justClear?: boolean; revoke?: boolean },
  ): Promise<void>
  archiveChats(peers: MtcuteInputPeerLike[], params?: { unarchive?: boolean }): Promise<void>
  markChatUnread(peer: MtcuteInputPeerLike): Promise<void>
  /** Resolve a peer (id/username/phone) to its current tl.TypeInputPeer. */
  resolvePeer(peer: MtcuteInputPeerLike): Promise<TlInputPeer>
  call<T = unknown>(method: string, params: Record<string, unknown>): Promise<T>
}

/** Mirror of mtcute's tl.TypeInputPeer — just the variants we construct. */
export type TlInputPeer =
  | { _: 'inputPeerSelf' }
  | { _: 'inputPeerUser'; user_id: number }
  | { _: 'inputPeerChat'; chat_id: number }
  | { _: 'inputPeerChannel'; channel_id: number; access_hash: string | number }

export type MtcuteInputPeerLike = string | number

/** Subset of mtcute's User class — just the fields we read. */
export interface MtcuteUser {
  type: 'user'
  id: number
  displayName: string
  isVerified: boolean
  username: string | null
}

/** Subset of mtcute's Chat class — just the fields we read. */
export interface MtcuteChat {
  type: 'chat'
  id: number
  title: string | null
  isVerified: boolean
  // mtcute uses ChatType values; we narrow to the ones we care about.
  // 'channel' | 'gigagroup' → broadcast, 'group' | 'supergroup' → group,
  // 'private' | 'bot' → user (handled via dialog.peer.user)
  chatType: 'group' | 'supergroup' | 'channel' | 'gigagroup' | 'private' | 'bot'
}

/** Subset of mtcute's Dialog class — just the fields we read. */
export interface MtcuteDialog {
  peer: MtcuteUser | MtcuteChat
  unreadCount: number
  isPinned: boolean
  lastMessage: MtcuteMessage | null
}

/** Subset of mtcute's Message class — just the fields we read. */
export interface MtcuteMessage {
  id: number
  date: Date
  isOutgoing: boolean
  text: string
  sender: { id: number }
  chatId: number
}

/**
 * Adapter: TelegramClient from @mtcute/node is structurally compatible
 * with MtcuteClientSurface at runtime (methods exist on prototype).
 * Cast at the injection point only.
 */
export function asMtcuteSurface(client: TelegramClient): MtcuteClientSurface {
  return client as unknown as MtcuteClientSurface
}

/**
 * Real-Telegram dialog provider backed by mtcute.
 *
 * Adapter for the {@link DialogProvider} interface used by the routes
 * layer. Maps mtcute's rich Dialog/Peer/Message objects onto the
 * project's narrower zod-derived schema (`@telewa/contracts`).
 *
 * Auth state is owned by the surrounding `MtcuteTelegramAdapter`; this
 * provider is only invoked when the user is authenticated (the routes
 * gate on it).
 */
export class MtcuteDialogProvider {
  constructor(private readonly client: MtcuteClientSurface) {}

  // DialogProvider expects setAuthState but this provider doesn't gate
  // on auth — the surrounding MtcuteTelegramAdapter + routes handle that.
  setAuthState(_status: 'authenticated' | 'unauthenticated' | 'requires_code'): void {
    /* no-op */
  }

  async getCurrentUser(): Promise<{ id: string; title: string; initials: string } | null> {
    try {
      const me = await this.client.getMe()
      return {
        id: String(me.id),
        title: me.displayName,
        initials: computeInitials(me.displayName),
      }
    } catch (err) {
      throw new Error(`getCurrentUser failed: ${sanitizePeerError(err)}`, { cause: err })
    }
  }

  async listDialogs(): Promise<DialogList> {
    const dialogs: Dialog[] = []
    let total = 0
    // iterDialogs is anti-chronological (Telegram API limit). Cap at 200
    // to match what the fixture provider offers.
    for await (const mt of this.client.iterDialogs({ limit: 200 })) {
      const mapped = mapDialog(mt)
      if (mapped) {
        dialogs.push(mapped)
        total += 1
      }
    }
    return { dialogs, total }
  }

  async updateDialog(
    chatId: string,
    updates: Partial<Pick<Dialog, 'pinned' | 'muted' | 'archived' | 'unread'>>,
  ): Promise<Dialog | null> {
    // Validate first — muted is not yet implemented and must NOT run after
    // partial side-effects (Pi R3).
    if (typeof updates.muted === 'boolean') {
      // No high-level wrapper in mtcute 0.8.0. The TL path is:
      //   account.updateNotifySettings({ peer: inputNotifyPeer, settings: inputPeerNotifySettings })
      // TODO: wire via this.client.call('account.updateNotifySettings', {...})
      // Tracked in docs/REAL-TELEGRAM-PLAN.md.
      throw new Error(
        'updateDialog(muted) is not yet implemented in MtcuteDialogProvider — ' +
          'tracked in docs/REAL-TELEGRAM-PLAN.md',
      )
    }

    const peer = parseChatId(chatId)
    if (peer === null) return null

    if (typeof updates.pinned === 'boolean') {
      // messages.toggleDialogPin expects {peer: InputDialogPeer} where
      // InputDialogPeer wraps the resolved InputPeer for the target chat.
      // Using inputPeerSelf here would pin/unpin Saved Messages, not the
      // requested chat (Pi R1).
      const inputPeer = await this.client.resolvePeer(peer)
      await this.client.call('messages.toggleDialogPin', {
        peer: { _: 'inputDialogPeer', peer: inputPeer },
        pinned: updates.pinned,
      })
    }
    if (typeof updates.archived === 'boolean') {
      // updates.archived = true  → archive   → unarchive: false
      // updates.archived = false → unarchive → unarchive: true
      await this.client.archiveChats([peer], { unarchive: !updates.archived })
    }
    if (typeof updates.unread === 'boolean') {
      // markChatUnread toggles the unread flag; clearing unread is via
      // readHistory (which is the typical "mark all as read" path).
      if (updates.unread) {
        await this.client.markChatUnread(peer)
      } else {
        await this.client.readHistory(peer)
      }
    }

    // Best-effort echo of the new flags. Route layer can re-list if it
    // needs canonical state from Telegram.
    return {
      id: chatId,
      peer: { id: chatId, type: 'user', title: '', initials: '' },
      lastMessage: null,
      unread: updates.unread ?? 0,
      pinned: updates.pinned ?? false,
      muted: false,
      archived: updates.archived ?? false,
    }
  }

  async deleteDialog(chatId: string): Promise<boolean> {
    const peer = parseChatId(chatId)
    if (peer === null) return false
    // justClear: false → also delete for the other side where possible.
    await this.client.deleteHistory(peer, { justClear: false, revoke: true })
    return true
  }
}

/* ------------------------------------------------------------------ */
/* Mapping helpers                                                     */
/* ------------------------------------------------------------------ */

function mapDialog(mt: MtcuteDialog): Dialog | null {
  const peer = mapPeer(mt.peer)
  if (!peer) return null

  const last = mt.lastMessage ? mapLastMessage(mt.lastMessage) : null
  return {
    id: peer.id,
    peer,
    lastMessage: last,
    unread: mt.unreadCount ?? 0,
    pinned: mt.isPinned ?? false,
    // muted/archived aren't on mtcute Dialog; resolved via updateDialog flow.
    muted: false,
    archived: false,
  }
}

function mapPeer(node: MtcuteUser | MtcuteChat): Peer | null {
  if (node.type === 'user') {
    const u = node
    const peer: Peer = {
      id: String(u.id),
      type: 'user',
      title: u.displayName,
      initials: computeInitials(u.displayName),
    }
    if (u.isVerified) peer.verified = true
    if (u.username) peer.about = `@${u.username}`
    return peer
  }
  const c = node
  const isChannel = c.chatType === 'channel' || c.chatType === 'gigagroup'
  const isGroup =
    c.chatType === 'group' || c.chatType === 'supergroup' || c.chatType === 'gigagroup'
  const peer: Peer = {
    id: String(c.id),
    type: isChannel ? 'channel' : isGroup ? 'group' : 'user',
    title: c.title ?? '',
    initials: computeInitials(c.title ?? ''),
  }
  if (c.isVerified) peer.verified = true
  return peer
}

function mapLastMessage(mt: MtcuteMessage): LastMessage | null {
  const text = mt.text?.trim()
  if (!text) return null
  return {
    id: String(mt.id),
    text,
    sentAt: mt.date.toISOString(),
    senderId: String(mt.sender.id),
    outbox: mt.isOutgoing,
  }
}

function computeInitials(name: string): string {
  const cleaned = name.trim()
  if (!cleaned) return '?'
  const parts = cleaned.split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase()
}

function parseChatId(chatId: string): number | null {
  const n = Number(chatId)
  if (!Number.isFinite(n) || n <= 0) return null
  return n
}

function sanitizePeerError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err)
  return raw
    .replace(/[a-f0-9]{32,}/gi, '[hash]')
    .replace(/\+?\d[\d\s-]{6,}\d/g, '[phone]')
    .replace(/\B\/[^\s]*\.(db|sqlite|session)\b/gi, '/[session]')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 200)
}
