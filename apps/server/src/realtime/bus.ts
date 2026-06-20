import type { RealtimeEvent } from '@telewa/contracts'

type Listener = (event: RealtimeEvent) => void

/**
 * In-process pub/sub bus for real-time events.
 * Subscribers can be WebSocket clients, SSE clients, or background workers.
 */
export class RealtimeBus {
  private listeners = new Set<Listener>()

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  publish(event: RealtimeEvent) {
    for (const fn of this.listeners) {
      try {
        fn(event)
      } catch (err) {
        console.error('realtime listener failed', err)
      }
    }
  }

  size() {
    return this.listeners.size
  }
}
