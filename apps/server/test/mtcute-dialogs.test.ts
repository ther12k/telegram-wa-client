import { describe, expect, it, vi } from 'vitest'
import {
  MtcuteDialogProvider,
  type MtcuteChat,
  type MtcuteClientSurface,
  type MtcuteDialog,
  type MtcuteUser,
} from '../src/adapters/mtcute-dialogs'

/* ------------------------------------------------------------------ */
/* Fake client                                                         */
/* ------------------------------------------------------------------ */

class FakeMtcuteClient implements MtcuteClientSurface {
  dialogs: MtcuteDialog[] = []
  me: MtcuteUser | null = null
  calls: Array<{ method: string; params: unknown }> = []

  async getMe(): Promise<MtcuteUser> {
    if (!this.me) throw new Error('No me')
    return this.me
  }
  async *iterDialogs(_params?: { limit?: number }): AsyncIterable<MtcuteDialog> {
    for (const d of this.dialogs) yield d
  }
  async getHistory(): Promise<never[]> {
    return []
  }
  async sendText(): Promise<never> {
    throw new Error('not implemented in fake')
  }
  async readHistory(): Promise<void> {
    /* no-op */
  }
  async searchGlobal(): Promise<never[]> {
    return []
  }
  async searchMessages(): Promise<never[]> {
    return []
  }
  async deleteHistory(): Promise<void> {
    /* no-op */
  }
  async archiveChats(): Promise<void> {
    /* no-op */
  }
  async markChatUnread(): Promise<void> {
    /* no-op */
  }
  async resolvePeer(peer: number): Promise<{ _: 'inputPeerUser'; user_id: number }> {
    return { _: 'inputPeerUser', user_id: peer }
  }
  async call<T = unknown>(method: string, params: Record<string, unknown>): Promise<T> {
    this.calls.push({ method, params })
    return undefined as T
  }
}

/* ------------------------------------------------------------------ */
/* Fixtures                                                            */
/* ------------------------------------------------------------------ */

function makeUser(over: Partial<MtcuteUser> = {}): MtcuteUser {
  return {
    type: 'user',
    id: 100,
    displayName: 'Alice Chen',
    isVerified: false,
    username: 'alice',
    ...over,
  }
}

function makeChat(over: Partial<MtcuteChat> = {}): MtcuteChat {
  return {
    type: 'chat',
    id: 200,
    title: 'Design Team',
    isVerified: true,
    chatType: 'supergroup',
    ...over,
  }
}

function makeChannel(over: Partial<MtcuteChat> = {}): MtcuteChat {
  return { ...makeChat({ id: 300, title: 'Teletalk Updates', chatType: 'channel' }), ...over }
}

/* ------------------------------------------------------------------ */
/* Tests                                                               */
/* ------------------------------------------------------------------ */

describe('MtcuteDialogProvider', () => {
  describe('getCurrentUser', () => {
    it('returns mapped user info from getMe()', async () => {
      const client = new FakeMtcuteClient()
      client.me = makeUser({ id: 42, displayName: 'Bob Builder', username: 'bob' })
      const p = new MtcuteDialogProvider(() => client)
      const me = await p.getCurrentUser()
      expect(me).toEqual({ id: '42', title: 'Bob Builder', initials: 'BB' })
    })

    it('handles single-word display names', async () => {
      const client = new FakeMtcuteClient()
      client.me = makeUser({ id: 7, displayName: 'cher' })
      const p = new MtcuteDialogProvider(() => client)
      const me = await p.getCurrentUser()
      expect(me?.initials).toBe('CH')
    })

    it('handles empty display name with ?', async () => {
      const client = new FakeMtcuteClient()
      client.me = makeUser({ displayName: '' })
      const p = new MtcuteDialogProvider(() => client)
      const me = await p.getCurrentUser()
      expect(me?.initials).toBe('?')
    })

    it('throws sanitized error when getMe fails', async () => {
      const client = new FakeMtcuteClient()
      const p = new MtcuteDialogProvider(() => client)
      await expect(p.getCurrentUser()).rejects.toThrow(/getCurrentUser failed/)
    })
  })

  describe('listDialogs', () => {
    it('maps user dialogs to the Dialog schema', async () => {
      const client = new FakeMtcuteClient()
      client.dialogs = [
        {
          peer: makeUser({ id: 1, displayName: 'Alice Chen', isVerified: true, username: 'alice' }),
          unreadCount: 2,
          isPinned: true,
          lastMessage: null,
        },
      ]
      const p = new MtcuteDialogProvider(() => client)
      const { dialogs, total } = await p.listDialogs()
      expect(total).toBe(1)
      expect(dialogs).toHaveLength(1)
      expect(dialogs[0]).toMatchObject({
        id: '1',
        peer: {
          id: '1',
          type: 'user',
          title: 'Alice Chen',
          initials: 'AC',
          verified: true,
          about: '@alice',
        },
        unread: 2,
        pinned: true,
      })
    })

    it('maps group chats to type=group', async () => {
      const client = new FakeMtcuteClient()
      client.dialogs = [
        {
          peer: makeChat({ id: 10, title: 'Design Team', chatType: 'supergroup' }),
          unreadCount: 0,
          isPinned: false,
          lastMessage: null,
        },
      ]
      const p = new MtcuteDialogProvider(() => client)
      const { dialogs } = await p.listDialogs()
      expect(dialogs[0]?.peer.type).toBe('group')
    })

    it('maps channels to type=channel', async () => {
      const client = new FakeMtcuteClient()
      client.dialogs = [
        {
          peer: makeChannel({ id: 20, title: 'News', chatType: 'channel' }),
          unreadCount: 0,
          isPinned: false,
          lastMessage: null,
        },
      ]
      const p = new MtcuteDialogProvider(() => client)
      const { dialogs } = await p.listDialogs()
      expect(dialogs[0]?.peer.type).toBe('channel')
    })
  })

  describe('updateDialog', () => {
    it('returns null for non-numeric chatId', async () => {
      const client = new FakeMtcuteClient()
      const p = new MtcuteDialogProvider(() => client)
      const result = await p.updateDialog('not-a-number', { pinned: true })
      expect(result).toBeNull()
      expect(client.calls).toHaveLength(0)
    })

    it('pinned=true resolves peer then calls messages.toggleDialogPin via TL', async () => {
      const client = new FakeMtcuteClient()
      const p = new MtcuteDialogProvider(() => client)
      await p.updateDialog('123', { pinned: true })
      // R1 fix: peer must be the target chat wrapped as inputDialogPeer,
      // not inputPeerSelf (which would pin Saved Messages).
      expect(client.calls).toContainEqual({
        method: 'messages.toggleDialogPin',
        params: {
          peer: { _: 'inputDialogPeer', peer: { _: 'inputPeerUser', user_id: 123 } },
          pinned: true,
        },
      })
    })

    it('archived=false calls archiveChats with unarchive flag', async () => {
      const client = new FakeMtcuteClient()
      const spy = vi.spyOn(client, 'archiveChats')
      const p = new MtcuteDialogProvider(() => client)
      await p.updateDialog('456', { archived: false })
      expect(spy).toHaveBeenCalledWith([456], { unarchive: true })
    })

    it('muted throws not-yet-implemented error', async () => {
      const client = new FakeMtcuteClient()
      const p = new MtcuteDialogProvider(() => client)
      await expect(p.updateDialog('789', { muted: true })).rejects.toThrow(/not yet implemented/)
    })

    it('muted throws BEFORE any side-effect (R3: no partial mutation)', async () => {
      // Combined update with muted alongside pinned/archived/unread.
      // R3: muted must validate first so Telegram state is not half-mutated.
      const client = new FakeMtcuteClient()
      const p = new MtcuteDialogProvider(() => client)
      await expect(
        p.updateDialog('100', { pinned: true, archived: false, unread: 1, muted: true }),
      ).rejects.toThrow(/not yet implemented/)
      // No TL call should have fired for pinned, no archiveChats, no markChatUnread.
      expect(client.calls).toHaveLength(0)
      expect(client.calls).not.toContainEqual(
        expect.objectContaining({ method: 'messages.toggleDialogPin' }),
      )
    })
  })

  describe('deleteDialog', () => {
    it('returns false for non-numeric chatId', async () => {
      const client = new FakeMtcuteClient()
      const p = new MtcuteDialogProvider(() => client)
      expect(await p.deleteDialog('not-a-number')).toBe(false)
    })

    it('calls deleteHistory with revoke=true', async () => {
      const client = new FakeMtcuteClient()
      const spy = vi.spyOn(client, 'deleteHistory')
      const p = new MtcuteDialogProvider(() => client)
      expect(await p.deleteDialog('123')).toBe(true)
      expect(spy).toHaveBeenCalledWith(123, { justClear: false, revoke: true })
    })
  })
})
