import { useEffect, useState } from 'react'
import type { ProjectState } from '@telewa/contracts'
import { api } from './api'
import Onboarding from './components/Onboarding'
import Messenger from './components/Messenger'
import { TopBanner, StateOverlay } from './components/Panels'
import { AuthTokenProvider } from './contexts/AuthToken'
import { LoginGate } from './components/LoginGate'

type Stage = 'onboarding' | 'app'
type Network = 'online' | 'offline' | 'reconnecting'
type Overlay = 'loading' | 'empty' | 'error' | 'offline' | 'reconnecting' | null

export default function App() {
  return (
    <AuthTokenProvider>
      <AppInner />
    </AuthTokenProvider>
  )
}

function AppInner() {
  const [stage, setStage] = useState<Stage>('onboarding')
  const [dark, setDark] = useState(false)
  const [network, setNetwork] = useState<Network>('online')
  const [overlay, setOverlay] = useState<Overlay>(null)
  const [projectState, setProjectState] = useState<ProjectState | null>(null)
  const [serverOnline, setServerOnline] = useState(false)

  // Fetch initial project state and sync active authentication stage
  useEffect(() => {
    let active = true

    // Sync initial API version / project info
    api
      .projectState()
      .then((state) => {
        if (!active) return
        setProjectState(state)
        setServerOnline(true)
      })
      .catch(() => {
        if (!active) return
        setServerOnline(false)
      })

    // Fetch initial auth state from backend to see if we're already logged in
    const syncAuth = async () => {
      try {
        const state = await api.getAuthState()
        if (!active) return
        if (state.status === 'authenticated') {
          setStage('app')
        } else {
          setStage('onboarding')
        }
      } catch {
        // Fallback to local storage/session storage if backend check fails
        if (typeof window !== 'undefined' && sessionStorage.getItem('tt_stage') === 'app') {
          setStage('app')
        }
      }
    }
    syncAuth()

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    const root = document.documentElement
    if (dark) root.classList.add('dark')
    else root.classList.remove('dark')
  }, [dark])

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  const finishLogin = () => {
    setOverlay('loading')
    setTimeout(() => {
      setOverlay(null)
      setStage('app')
      try {
        sessionStorage.setItem('tt_stage', 'app')
      } catch {
        // ignored
      }
    }, 900)
  }

  const logout = async () => {
    try {
      await api.logout()
    } catch (err) {
      console.error('Failed to log out cleanly from server', err)
    }
    setStage('onboarding')
    try {
      sessionStorage.removeItem('tt_stage')
      sessionStorage.removeItem('auth_token')
    } catch {
      // ignored
    }
  }

  const applyDemoState = (state: Network | 'error' | 'empty') => {
    if (state === 'error') {
      setOverlay('error')
      setTimeout(() => setOverlay(null), 2200)
      return
    }
    if (state === 'empty') {
      setOverlay('empty')
      setTimeout(() => setOverlay(null), 2200)
      return
    }
    setNetwork(state)
    if (state === 'reconnecting') setTimeout(() => setNetwork('online'), 2400)
  }

  return (
    <div className={dark ? 'dark' : ''}>
      <div className="h-screen w-screen overflow-hidden bg-slate-100 dark:bg-[#0b141a] text-slate-900 dark:text-slate-100 flex flex-col">
        <LoginGate>
          {stage === 'app' && <TopBanner state={network} />}
          <div className="fixed top-3 right-3 z-[70] rounded-full bg-white/90 dark:bg-[#202c33]/95 px-3 py-1.5 text-[11px] font-semibold shadow-lg ring-1 ring-slate-200 dark:ring-white/10">
            <span className={serverOnline ? 'text-emerald-600' : 'text-rose-500'}>●</span>{' '}
            {serverOnline ? 'API connected' : 'API offline'}
            {projectState ? (
              <span className="ml-2 text-slate-400">{projectState.activePhase}</span>
            ) : null}
          </div>
          <div className="flex-1 min-h-0 relative">
            {stage === 'onboarding' && <Onboarding onDone={finishLogin} />}
            {stage === 'app' && (
              <>
                <Messenger dark={dark} toggleDark={() => setDark(!dark)} onLogout={logout} />
                <StateOverlay state={overlay} onRetry={() => setOverlay(null)} />
              </>
            )}

            {/* Demo controls — for stakeholder presentation */}
            {stage === 'app' && (
              <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[55]">
                <div className="bg-white/95 dark:bg-[#202c33]/95 backdrop-blur rounded-2xl shadow-2xl ring-1 ring-slate-200 dark:ring-white/10 px-2 py-1.5 flex items-center gap-1">
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 pl-2 pr-1">
                    States
                  </span>
                  {[
                    { label: 'Reconnecting', action: () => applyDemoState('reconnecting') },
                    { label: 'Offline', action: () => applyDemoState('offline') },
                    { label: 'Online', action: () => applyDemoState('online') },
                    { label: 'Error', action: () => applyDemoState('error') },
                    { label: 'Empty', action: () => applyDemoState('empty') },
                    {
                      label: 'Loading',
                      action: () => {
                        setOverlay('loading')
                        setTimeout(() => setOverlay(null), 1600)
                      },
                    },
                  ].map((b) => (
                    <button
                      key={b.label}
                      onClick={b.action}
                      className="text-[11px] px-2.5 h-7 rounded-xl hover:bg-slate-100 dark:hover:bg-[#1f2c33] text-slate-700 dark:text-slate-200 font-medium"
                    >
                      {b.label}
                    </button>
                  ))}
                  <div className="w-px h-5 bg-slate-200 dark:bg-white/10 mx-1" />
                  <button
                    onClick={() => setDark(!dark)}
                    className="text-[11px] px-2.5 h-7 rounded-xl hover:bg-slate-100 dark:hover:bg-[#1f2c33] text-slate-700 dark:text-slate-200 font-medium"
                  >
                    {dark ? '☀️ Light' : '🌙 Dark'}
                  </button>
                  <button
                    onClick={logout}
                    className="text-[11px] px-2.5 h-7 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-900/20 text-rose-500 font-medium"
                  >
                    Reset
                  </button>
                </div>
              </div>
            )}
          </div>
        </LoginGate>
      </div>
    </div>
  )
}
