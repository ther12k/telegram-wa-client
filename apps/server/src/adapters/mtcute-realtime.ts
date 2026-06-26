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
 *
 * Uses mtcute TelegramClient's EventEmitter .on/.off directly (the
 * surface is cast through `any` for the EventEmitter methods since they
 * are runtime-attached, not in the typed surface).
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const emitter = surface as any

    const bind = <A extends unknown[]>(event: string, fn: (...args: A) => void) => {
      emitter.on(event, fn)
      this.cleanupFns.push(() => emitter.off(event, fn))
    }

    bind<[MtcuteMessage]>('new_message', (msg) => {
      const event: RealtimeEvent = {
        type: 'message.new',
        chatId: String(msg.chatId),
        message: mtcuteMessageToContract(msg),
      }
      bus.publish(event)
    })

    bind<[MtcuteMessage]>('edit_message', (msg) => {
      const event: RealtimeEvent = {
        type: 'message.update',
        chatId: String(msg.chatId),
        messageId: String(msg.id),
        status: 'sent',
      }
      bus.publish(event)
    })

    // Delete messages are not mapped to RealtimeEvent yet.
    // Tracked: add message.delete to realtimeEventSchema.
    // bind<[number[], number?]>('delete_messages', (_messageIds, _channelId) => {})
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
    kind: 'text' as const,
    sentAt: msg.date instanceof Date ? msg.date.toISOString() : new Date().toISOString(),
    status: 'sent' as const,
  }
}
