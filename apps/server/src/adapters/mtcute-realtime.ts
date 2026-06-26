import type { RealtimeEvent } from '@telewa/contracts'
import type { RealtimeBus } from '../realtime/bus'
import type { MtcuteClientSurface, MtcuteMessage } from './mtcute-dialogs'

/**
 * Real-Telegram real-time provider (Story 7).
 *
 * Registers mtcute update handlers on the live client and maps Telegram
 * events to the existing RealtimeEvent union published on the bus.
 * The frontend already consumes RealtimeEvent — no UI changes needed.
 *
 * Thunk-based constructor (same pattern as MtcuteDialogProvider /
 * MtcuteMessageProvider): accepts a `() => MtcuteClientSurface` so the
 * adapter's lazy-init + logout-recreate lifecycle is transparent.
 */
export class MtcuteRealtimeProvider {
  private cleanupFns: (() => void)[] = []

  constructor(
    private readonly client: () => MtcuteClientSurface,
    private readonly bus: RealtimeBus,
  ) {}

  /**
   * Start listening for mtcute updates and forwarding them to the bus.
   * Safe to call multiple times (previous handlers are removed first).
   */
  start(): void {
    this.stop()

    const surface = this.client()
    const bus = this.bus

    // Helper: call `client.onXxx` and record the unsubscribe convention.
    // mtcute 0.8 uses EventEmitter-style .on() → .off() or returns
    // an unsubscribe function. We use the `.on()` pattern and keep
    // a reference for removal.
    const bind = (event: string, fn: (...args: unknown[]) => void) => {
      // mtcute TelegramClient extends EventEmitter — .on returns the client
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(surface as any).on(event, fn)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.cleanupFns.push(() => (surface as any).off(event, fn))
    }

    bind('new_message', (msg: MtcuteMessage) => {
      const event: RealtimeEvent = {
        type: 'message.new',
        chatId: String(msg.chatId),
        message: mtcuteMessageToContract(msg),
      }
      bus.publish(event)
    })

    bind('edit_message', (msg: MtcuteMessage) => {
      const event: RealtimeEvent = {
        type: 'message.update',
        chatId: String(msg.chatId),
        messageId: String(msg.id),
        status: 'sent',
      }
      bus.publish(event)
    })

    bind('delete_messages', (messageIds: number[], channelId?: number) => {
      // Deleted messages don't cleanly map to the current RealtimeEvent
      // union (no "message.delete" type yet). Publish nothing for now
      // — a future PR can add it. The important events (new + edit) are
      // covered above.
      //
      // Tracked: add message.delete to realtimeEventSchema.
    })

    // Also register via the direct handlers (more specific than raw .on)
    // The raw .on('new_message') above should fire for all new messages.
    // We skip the raw onUpdate path to avoid double-firing.
  }

  /**
   * Remove all registered update handlers from the client.
   */
  stop(): void {
    for (const fn of this.cleanupFns) {
      fn()
    }
    this.cleanupFns = []
  }
}

/**
 * Map an mtcute message to the contract Message shape.
 * Only the fields needed for real-time display are populated — the
 * full message object can be fetched via getHistory if needed.
 */
function mtcuteMessageToContract(msg: MtcuteMessage) {
  const text = typeof msg.text === 'string' ? msg.text : String(msg.text ?? '')

  return {
    id: String(msg.id),
    chatId: String(msg.chatId),
    senderId: String(msg.sender?.id ?? ''),
    outbox: msg.isOutgoing ?? false,
    text,
    sentAt: msg.date instanceof Date ? msg.date.toISOString() : new Date().toISOString(),
    status: 'sent' as const,
  }
}
