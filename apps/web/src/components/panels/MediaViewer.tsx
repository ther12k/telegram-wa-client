import { X } from 'lucide-react'

export function MediaViewer({ url, caption, onClose }: { url: string; caption?: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center animate-fade-in" onClick={onClose}>
      <button className="absolute top-4 right-4 h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center backdrop-blur">
        <X className="h-5 w-5" />
      </button>
      <div onClick={(e) => e.stopPropagation()} className="max-w-3xl max-h-[85vh] mx-4">
        <img src={url} alt="preview" className="max-h-[80vh] max-w-full rounded-xl shadow-2xl object-contain" />
        {caption && <div className="mt-3 text-center text-sm text-white/80 max-w-lg mx-auto">{caption}</div>}
      </div>
    </div>
  )
}
