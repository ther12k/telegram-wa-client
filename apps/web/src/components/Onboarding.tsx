import { useState, useRef, useEffect } from 'react'
import {
  ArrowRight,
  ArrowLeft,
  Phone,
  ShieldCheck,
  QrCode,
  Lock,
  MessageCircle,
  Users,
  Globe2,
  Check,
} from 'lucide-react'
import { api } from '../api'

export default function Onboarding({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState<'welcome' | 'phone' | 'otp' | 'password' | 'qr'>('welcome')
  const [phone, setPhone] = useState('415 555 0199')
  const [country, setCountry] = useState('+1')
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [qrScanning, setQrScanning] = useState(false)
  const [qrUrl, setQrUrl] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [resendTimer, setResendTimer] = useState(42)
  const otpRefs = useRef<Array<HTMLInputElement | null>>([])

  // Polling authentication state on mount and step changes
  useEffect(() => {
    let active = true
    const checkState = async () => {
      try {
        const state = await api.getAuthState()
        if (!active) return
        if (state.status === 'authenticated') {
          onDone()
        } else if (state.status === 'requires_password') {
          setStep('password')
        } else if (state.status === 'requires_code') {
          setStep('otp')
        } else if (state.status === 'requires_qr' && state.qrCodeUrl) {
          setQrUrl(state.qrCodeUrl)
          setStep('qr')
        }
      } catch (err) {
        console.error('Failed to sync auth state', err)
      }
    }
    checkState()
    const timer = setInterval(checkState, 2000)
    return () => {
      active = false
      clearInterval(timer)
    }
  }, [step, onDone])

  // Countdown timer for resending code
  useEffect(() => {
    if (step !== 'otp' || resendTimer <= 0) return
    const id = setTimeout(() => setResendTimer((t) => t - 1), 1000)
    return () => clearTimeout(id)
  }, [step, resendTimer])

  useEffect(() => {
    if (step === 'otp') otpRefs.current[0]?.focus()
  }, [step])

  const onOtpChange = async (i: number, v: string) => {
    if (!/^\d?$/.test(v)) return
    const next = [...otp]
    next[i] = v
    setOtp(next)
    if (v && i < 5) {
      otpRefs.current[i + 1]?.focus()
    }
    if (next.every(Boolean)) {
      const fullCode = next.join('')
      try {
        setErrorMsg('')
        const state = await api.submitCode({ code: fullCode })
        if (state.status === 'requires_password') {
          setStep('password')
        } else if (state.status === 'authenticated') {
          onDone()
        }
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : 'Invalid code.')
      }
    }
  }

  const onOtpKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) otpRefs.current[i - 1]?.focus()
  }

  const handleSendPhone = async () => {
    try {
      setErrorMsg('')
      const fullNumber = `${country}${phone.replace(/\s+/g, '')}`
      const state = await api.sendCode({ phone: fullNumber })
      if (state.status === 'requires_code') {
        setResendTimer(42)
        setStep('otp')
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to send verification code.')
    }
  }

  const handleVerifyPassword = async () => {
    try {
      setErrorMsg('')
      const state = await api.submitPassword({ password })
      if (state.status === 'authenticated') {
        onDone()
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Incorrect password.')
    }
  }

  const handleStartQr = async () => {
    try {
      setErrorMsg('')
      setQrScanning(true)
      const state = await api.startQrLogin()
      if (state.qrCodeUrl) {
        setQrUrl(state.qrCodeUrl)
        setStep('qr')
      }
    } catch (err) {
      setQrScanning(false)
      setErrorMsg(err instanceof Error ? err.message : 'Failed to start QR code login.')
    }
  }

  const handleBackToPhone = async () => {
    try {
      await api.logout()
      setOtp(['', '', '', '', '', ''])
      setPassword('')
      setErrorMsg('')
      setStep('phone')
    } catch {
      setStep('phone')
    }
  }

  const handleBackToWelcome = async () => {
    try {
      await api.logout()
      setErrorMsg('')
      setStep('welcome')
    } catch {
      setStep('welcome')
    }
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-[#0b141a] dark:via-[#0f1a21] dark:to-[#0b141a] flex items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-md">
        {/* Brand mark */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="relative">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-700 flex items-center justify-center shadow-lg shadow-brand-500/30">
              <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="currentColor">
                <path d="M20.5 3.5L3.8 10.2c-1.1.4-1.1 1.1-.2 1.4l4.3 1.3 1.6 5.1c.2.6.4.8.8.8.4 0 .6-.2.9-.5l2-2 4.2 3.1c.8.4 1.3.2 1.5-.7l2.7-12.8c.3-1.1-.4-1.6-1.1-1.4zM9 14.1l-.5 3.2-1.2-3.9 8.9-5.7c.4-.3.8-.1.5.2L9 14.1z" />
              </svg>
            </div>
          </div>
          <div className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Teletalk
          </div>
        </div>

        <div className="bg-white dark:bg-[#111b21] rounded-3xl shadow-xl shadow-slate-200/60 dark:shadow-black/40 ring-1 ring-slate-200/70 dark:ring-white/5 p-7 sm:p-8 animate-fade-in">
          {errorMsg && (
            <div className="mb-4 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 text-xs font-medium text-center">
              {errorMsg}
            </div>
          )}

          {step === 'welcome' && (
            <div className="text-center space-y-6">
              <div className="mx-auto h-24 w-24 rounded-3xl bg-gradient-to-br from-brand-400 to-brand-700 flex items-center justify-center shadow-xl shadow-brand-500/30">
                <MessageCircle className="h-11 w-11 text-white" strokeWidth={2} />
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  Welcome to Teletalk
                </h1>
                <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
                  Fast, private messaging for everyone. End-to-end encrypted, beautifully simple.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-3 py-2">
                {[
                  { icon: ShieldCheck, label: 'Private' },
                  { icon: Users, label: 'Groups' },
                  { icon: Globe2, label: 'Worldwide' },
                ].map((f) => (
                  <div
                    key={f.label}
                    className="rounded-2xl bg-slate-50 dark:bg-[#1f2c33] p-3 text-center"
                  >
                    <f.icon className="h-5 w-5 text-brand-600 mx-auto mb-1.5" />
                    <div className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
                      {f.label}
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setStep('phone')}
                className="w-full h-12 rounded-2xl bg-brand-500 hover:bg-brand-600 active:scale-[.99] transition text-white font-semibold flex items-center justify-center gap-2 shadow-lg shadow-brand-500/30"
              >
                Get started <ArrowRight className="h-4 w-4" />
              </button>
              <button
                onClick={handleStartQr}
                className="w-full h-11 rounded-2xl bg-slate-100 dark:bg-[#1f2c33] hover:bg-slate-200 dark:hover:bg-[#253541] transition text-slate-700 dark:text-slate-200 text-sm font-medium flex items-center justify-center gap-2"
              >
                <QrCode className="h-4 w-4" /> Log in with QR code
              </button>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 pt-2">
                By continuing you agree to our Terms & Privacy Policy.
              </p>
            </div>
          )}

          {step === 'phone' && (
            <div className="space-y-5 animate-fade-in">
              <div>
                <button
                  onClick={handleBackToWelcome}
                  className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 text-sm inline-flex items-center gap-1"
                >
                  <ArrowLeft className="h-4 w-4" /> Back
                </button>
              </div>
              <div className="space-y-1">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  Enter your phone number
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  We'll send you a verification code.
                </p>
              </div>
              <div className="flex gap-2">
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="h-12 px-3 rounded-2xl bg-slate-100 dark:bg-[#1f2c33] border-0 text-sm font-medium text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-brand-500"
                >
                  <option value="+1">🇺🇸 +1</option>
                  <option value="+44">🇬🇧 +44</option>
                  <option value="+34">🇪🇸 +34</option>
                  <option value="+49">🇩🇪 +49</option>
                  <option value="+81">🇯🇵 +81</option>
                  <option value="+91">🇮🇳 +91</option>
                </select>
                <div className="flex-1 relative">
                  <Phone className="h-4 w-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Phone number"
                    className="w-full h-12 pl-10 pr-3 rounded-2xl bg-slate-100 dark:bg-[#1f2c33] text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-brand-500 outline-none"
                  />
                </div>
              </div>
              <button
                onClick={handleSendPhone}
                className="w-full h-12 rounded-2xl bg-brand-500 hover:bg-brand-600 transition text-white font-semibold flex items-center justify-center gap-2 shadow-lg shadow-brand-500/30"
              >
                Send verification code <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {step === 'otp' && (
            <div className="space-y-5 animate-fade-in">
              <div>
                <button
                  onClick={handleBackToPhone}
                  className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 text-sm inline-flex items-center gap-1"
                >
                  <ArrowLeft className="h-4 w-4" /> Back
                </button>
              </div>
              <div className="space-y-1">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  Verify your number
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Enter the code sent to{' '}
                  <span className="font-medium text-slate-700 dark:text-slate-200">
                    {country} {phone}
                  </span>
                  .
                </p>
              </div>
              <div className="flex justify-center gap-2">
                {otp.map((v, i) => (
                  <input
                    key={i}
                    ref={(el) => {
                      otpRefs.current[i] = el
                    }}
                    inputMode="numeric"
                    maxLength={1}
                    value={v}
                    onChange={(e) => onOtpChange(i, e.target.value)}
                    onKeyDown={(e) => onOtpKey(i, e)}
                    className="h-14 w-12 rounded-2xl bg-slate-100 dark:bg-[#1f2c33] text-center text-xl font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none"
                  />
                ))}
              </div>
              <div className="flex items-center justify-center gap-2 text-sm">
                <div className="h-8 w-8 rounded-full bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center text-brand-600 font-semibold">
                  {resendTimer}
                </div>
                <span className="text-slate-500 dark:text-slate-400">Resend code in seconds</span>
              </div>
            </div>
          )}

          {step === 'password' && (
            <div className="space-y-5 animate-fade-in">
              <div>
                <button
                  onClick={handleBackToPhone}
                  className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 text-sm inline-flex items-center gap-1"
                >
                  <ArrowLeft className="h-4 w-4" /> Back
                </button>
              </div>
              <div className="mx-auto h-14 w-14 rounded-2xl bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center">
                <Lock className="h-6 w-6 text-brand-600" />
              </div>
              <div className="text-center space-y-1">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  Two-step verification
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Enter your password to secure your account.
                </p>
              </div>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter Password"
                  className="w-full h-12 px-4 pr-12 rounded-2xl bg-slate-100 dark:bg-[#1f2c33] text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-brand-500 outline-none text-center font-semibold"
                />
                <button
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 h-8 w-8 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center justify-center"
                  aria-label="toggle"
                >
                  <ShieldCheck className="h-4 w-4" />
                </button>
              </div>
              <button
                onClick={handleVerifyPassword}
                className="w-full h-12 rounded-2xl bg-brand-500 hover:bg-brand-600 transition text-white font-semibold flex items-center justify-center gap-2 shadow-lg shadow-brand-500/30"
              >
                <Check className="h-4 w-4" /> Verify
              </button>
            </div>
          )}

          {step === 'qr' && (
            <div className="space-y-5 animate-fade-in">
              <div>
                <button
                  onClick={handleBackToWelcome}
                  className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 text-sm inline-flex items-center gap-1"
                >
                  <ArrowLeft className="h-4 w-4" /> Back
                </button>
              </div>
              <div className="space-y-1 text-center">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  Log in with QR code
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Scan this code from your phone to continue.
                </p>
              </div>
              <div className="mx-auto p-4 bg-white rounded-2xl shadow-inner w-fit relative overflow-hidden">
                <QrSvg value={qrUrl} />
                {qrScanning && (
                  <div className="absolute inset-4 rounded-lg ring-2 ring-brand-500 pointer-events-none">
                    <div className="absolute inset-x-0 top-1/2 h-0.5 bg-brand-500 pulse-ring" />
                  </div>
                )}
              </div>
              <ol className="text-sm text-slate-600 dark:text-slate-300 space-y-2">
                <li className="flex gap-3">
                  <span className="h-6 w-6 rounded-full bg-brand-500 text-white flex items-center justify-center text-xs font-bold shrink-0">
                    1
                  </span>{' '}
                  Open Telegram on your phone
                </li>
                <li className="flex gap-3">
                  <span className="h-6 w-6 rounded-full bg-brand-500 text-white flex items-center justify-center text-xs font-bold shrink-0">
                    2
                  </span>{' '}
                  Go to <span className="font-medium">Settings → Devices → Link Desktop</span>
                </li>
                <li className="flex gap-3">
                  <span className="h-6 w-6 rounded-full bg-brand-500 text-white flex items-center justify-center text-xs font-bold shrink-0">
                    3
                  </span>{' '}
                  Scan this screen with your phone camera
                </li>
              </ol>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function QrSvg({ value }: { value?: string }) {
  const size = 25
  const cells: boolean[] = []
  let seed = 7
  // Use length of qrCode value to slightly vary QR structure
  const valLength = value?.length || 10
  for (let i = 0; i < size * size; i++) {
    seed = (seed * 9301 + 49297 + valLength) % 233280
    cells.push(seed / 233280 > 0.52)
  }
  const isFinder = (r: number, c: number) => {
    if (r < 7 && c < 7) return true
    if (r < 7 && c >= size - 7) return true
    if (r >= size - 7 && c < 7) return true
    return false
  }
  const finderFill = (r: number, c: number) => {
    const local = (rr: number, cc: number) => {
      const inBorder = rr === 0 || rr === 6 || cc === 0 || cc === 6
      const inCore = rr >= 2 && rr <= 4 && cc >= 2 && cc <= 4
      return inBorder || inCore
    }
    if (r < 7 && c < 7) return local(r, c)
    if (r < 7 && c >= size - 7) return local(r, c - (size - 7))
    if (r >= size - 7 && c < 7) return local(r - (size - 7), c)
    return false
  }
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={180} height={180} className="block">
      <rect width={size} height={size} fill="white" />
      {cells.map((v, i) => {
        const r = Math.floor(i / size)
        const c = i % size
        if (isFinder(r, c)) {
          if (finderFill(r, c))
            return <rect key={i} x={c} y={r} width={1} height={1} fill="#0f172a" />
          return null
        }
        return v ? <rect key={i} x={c} y={r} width={1} height={1} fill="#0f172a" /> : null
      })}
      <circle cx={size / 2} cy={size / 2} r={2.2} fill="white" />
      <circle cx={size / 2} cy={size / 2} r={1.6} fill="#1fa87a" />
    </svg>
  )
}
