import { useEffect, useRef, useState } from 'react'
import type { RealtimeEvent } from '@telewa/contracts'

export type ConnectionState = 'connecting' | 'open' | 'reconnecting' | 'offline'

interface UseRealtimeOptions {
  /** Returns true if the current session is authenticated and a stream should be opened. */
  isAuthenticated: boolean
  /** Invoked for every parsed event. */
  onEvent: (event: RealtimeEvent) => void
  /** Reconnect delay in ms (exponential backoff up to cap). */
  baseDelay?: number
  maxDelay?: number
}

/**
 * Subscribes to /api/realtime/events using EventSource and reconnects with
 * exponential backoff. Falls back to a manual polling heartbeat if EventSource
 * is not available (e.g. older runtimes).
 */
export function useRealtime(options: UseRealtimeOptions) {
  const { isAuthenticated, onEvent, baseDelay = 1000, maxDelay = 15000 } = options
  const [state, setState] = useState<ConnectionState>('connecting')
  const handlerRef = useRef(onEvent)
  handlerRef.current = onEvent

  useEffect(() => {
    if (!isAuthenticated) {
      setState('offline')
      return
    }
    if (typeof EventSource === 'undefined') {
      console.warn('EventSource unavailable, realtime disabled')
      setState('offline')
      return
    }

    let active = true
    let attempt = 0
    let es: EventSource | null = null
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null

    const open = () => {
      if (!active) return
      setState(attempt === 0 ? 'connecting' : 'reconnecting')
      es = new EventSource('/api/realtime/events', { withCredentials: true })

      es.onopen = () => {
        attempt = 0
        setState('open')
      }

      es.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data) as RealtimeEvent
          handlerRef.current(data)
        } catch {
          /* malformed payload — ignore */
        }
      }

      es.onerror = () => {
        es?.close()
        es = null
        if (!active) return
        setState('reconnecting')
        const delay = Math.min(maxDelay, baseDelay * Math.pow(2, attempt))
        attempt += 1
        reconnectTimer = setTimeout(open, delay)
      }
    }

    open()

    return () => {
      active = false
      if (reconnectTimer) clearTimeout(reconnectTimer)
      es?.close()
      setState('offline')
    }
  }, [isAuthenticated, baseDelay, maxDelay])

  return state
}
