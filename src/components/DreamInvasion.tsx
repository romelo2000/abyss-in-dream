import { useState, useEffect } from 'react'

export function DreamInvasion() {
  const [message, setMessage] = useState<string | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const abyss = window.abyss
    if (!abyss?.game?.dreamInvasion) return
    abyss.game.dreamInvasion().then((msg: string | null) => {
      if (msg) setMessage(msg)
    }).catch(() => {})
  }, [])

  if (!message || dismissed) return null

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-40 animate-scale-in">
      <div className="glass rounded-xl px-6 py-4 border border-abyss-glow/30 max-w-md">
        <div className="flex items-start gap-3">
          <span className="text-2xl text-abyss-glow animate-breathe">☽</span>
          <div className="flex-1">
            <p className="text-xs text-abyss-glow uppercase tracking-wider mb-1">Вторжение из сна</p>
            <p className="text-sm text-abyss-text italic">{message}</p>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="text-abyss-dim hover:text-abyss-text transition-colors text-sm"
            data-tooltip="Закрыть вторжение из сна"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  )
}
