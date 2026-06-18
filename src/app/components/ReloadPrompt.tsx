import React from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { RefreshCw, X } from 'lucide-react'

export function ReloadPrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW Registered: ', r)
    },
    onRegisterError(error) {
      console.log('SW registration error', error)
    },
  })

  const close = () => {
    setNeedRefresh(false)
  }

  if (!needRefresh) return null

  return (
    <div className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-[100] animate-in slide-in-from-bottom-5">
      <div className="bg-[#0F172A] border border-[#2563EB]/40 rounded-2xl p-4 shadow-2xl shadow-blue-900/20 max-w-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h3 className="text-white font-bold text-sm mb-1">New Update Available</h3>
            <p className="text-[#94A3B8] text-xs leading-relaxed">
              We just released a new version of Tonex CBT! Click reload to apply the updates.
            </p>
          </div>
          <button onClick={close} className="text-[#64748B] hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>
        
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => updateServiceWorker(true)}
            className="flex-1 flex items-center justify-center gap-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white px-4 py-2 rounded-xl text-xs font-bold transition-all"
          >
            <RefreshCw size={14} />
            Reload App
          </button>
        </div>
      </div>
    </div>
  )
}
