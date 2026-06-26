import { Check, CheckCheck, AlertCircle } from 'lucide-react'

export function StatusIcon({ status }: { status?: 'sending' | 'sent' | 'read' | 'failed' }) {
  if (!status) return null
  if (status === 'sending')
    return (
      <div className="h-3 w-3 rounded-full border-2 border-slate-400 border-t-transparent animate-spin" />
    )
  if (status === 'failed') return <AlertCircle className="h-3.5 w-3.5 text-rose-500" />
  if (status === 'sent') return <Check className="h-3.5 w-3.5 text-slate-400" />
  return <CheckCheck className="h-3.5 w-3.5 text-sky-500" />
}
