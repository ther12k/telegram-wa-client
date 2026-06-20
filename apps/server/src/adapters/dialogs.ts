import type { AuthState, Dialog, DialogList, LastMessage, Peer } from '@telewa/contracts'

export interface DialogProvider {
  /**
   * Returns the current authenticated user info (or null).
   */
  getCurrentUser(): Promise<{ id: string; title: string; initials: string } | null>

  /**
   * Lists dialogs (chat list) for the authenticated user, with last messages and counters.
   */
  listDialogs(): Promise<DialogList>

  /**
   * Mutates a dialog's state (pinned, muted, archived, unread, etc.)
   */
  updateDialog(
    chatId: string,
    updates: Partial<Pick<Dialog, 'pinned' | 'muted' | 'archived' | 'unread'>>,
  ): Promise<Dialog | null>

  /**
   * Deletes a dialog (removes it).
   */
  deleteDialog(chatId: string): Promise<boolean>
}

/**
 * Built-in fixture dialog provider used in place of the real Telegram client.
 * Generates a deterministic list of chats seeded by the auth phone number.
 */
export class FixtureDialogProvider implements DialogProvider {
  private authState: AuthState['status'] = 'unauthenticated'
  private dialogs: Dialog[] | null = null

  setAuthState(status: AuthState['status']) {
    this.authState = status
    if (status === 'unauthenticated') {
      this.dialogs = null
    }
  }

  async getCurrentUser() {
    if (this.authState !== 'authenticated') return null
    return { id: 'me', title: 'You', initials: 'YO' }
  }

  private initDialogs() {
    if (this.dialogs) return
    const peers: { peer: Peer; last: LastMessage | null; unread: number; pinned: boolean }[] = [
      {
        peer: {
          id: 'alice',
          type: 'user',
          title: 'Alice Chen',
          initials: 'AC',
          about: 'Designing the future 🎨',
          online: true,
        },
        last: {
          id: 'm-alice-last',
          text: 'See you tomorrow 👍',
          sentAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
          senderId: 'alice',
          outbox: false,
        },
        unread: 2,
        pinned: true,
      },
      {
        peer: {
          id: 'priya',
          type: 'user',
          title: 'Priya Raman',
          initials: 'PR',
          about: 'Code · Coffee · Repeat ☕',
          online: false,
          lastSeenAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        },
        last: {
          id: 'm-priya-last',
          text: 'You: Will share the design review tomorrow',
          sentAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
          senderId: 'me',
          outbox: true,
        },
        unread: 0,
        pinned: false,
      },
      {
        peer: {
          id: 'mom',
          type: 'user',
          title: 'Mom ❤️',
          initials: 'M',
          about: 'Call me when you can 💕',
        },
        last: {
          id: 'm-mom-last',
          text: "Don't forget to eat!",
          sentAt: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
          senderId: 'mom',
          outbox: false,
        },
        unread: 0,
        pinned: false,
      },
      {
        peer: {
          id: 'design-team',
          type: 'group',
          title: 'Design Team',
          initials: 'DT',
          members: 12,
          verified: true,
        },
        last: {
          id: 'm-dt-last',
          text: 'Sarah: pushed v2 mocks',
          sentAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          senderId: 'sarah',
          outbox: false,
        },
        unread: 5,
        pinned: false,
      },
      {
        peer: {
          id: 'teletalk-updates',
          type: 'channel',
          title: 'Teletalk Updates',
          initials: 'TU',
          verified: true,
          members: 9821,
        },
        last: {
          id: 'm-tu-last',
          text: 'New: encrypted media sharing',
          sentAt: new Date(Date.now() - 28 * 60 * 60 * 1000).toISOString(),
          senderId: 'teletalk-updates',
          outbox: false,
        },
        unread: 0,
        pinned: false,
      },
    ]

    this.dialogs = peers.map(({ peer, last, unread, pinned }) => ({
      id: peer.id,
      peer,
      lastMessage: last,
      unread,
      pinned,
      muted: false,
      archived: false,
    }))
  }

  async listDialogs(): Promise<DialogList> {
    this.initDialogs()
    return { dialogs: this.dialogs!, total: this.dialogs!.length }
  }

  async updateDialog(
    chatId: string,
    updates: Partial<Pick<Dialog, 'pinned' | 'muted' | 'archived' | 'unread'>>,
  ): Promise<Dialog | null> {
    this.initDialogs()
    const d = this.dialogs!.find((x) => x.id === chatId)
    if (!d) return null
    if (updates.pinned !== undefined) d.pinned = updates.pinned
    if (updates.muted !== undefined) d.muted = updates.muted
    if (updates.archived !== undefined) d.archived = updates.archived
    if (updates.unread !== undefined) d.unread = updates.unread
    return d
  }

  async deleteDialog(chatId: string): Promise<boolean> {
    this.initDialogs()
    const idx = this.dialogs!.findIndex((x) => x.id === chatId)
    if (idx === -1) return false
    this.dialogs!.splice(idx, 1)
    return true
  }
}
