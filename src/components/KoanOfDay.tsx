import { useState, useEffect } from 'react'

export function KoanOfDay() {
  const [koan, setKoan] = useState<string | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const abyss = window.abyss
    if (!abyss?.game?.koanOfDay) return
    abyss.game.koanOfDay().then((k: string) => setKoan(k)).catch(() => {})
  }, [])

  if (!koan || dismissed) return null

  return (
    <div className="px-6 py-3 border-b border-abyss-edge/20 glass animate-fade-in-slow">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-abyss-glow text-sm">☯</span>
            <span className="text-xs text-abyss-dim uppercase tracking-wider">Коан дня</span>
          </div>
          <p className="text-sm text-abyss-text italic">{koan}</p>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-abyss-dim hover:text-abyss-text transition-colors text-sm"
          data-tooltip="Закрыть коан дня"
        >
          ✕
        </button>
      </div>
    </div>
  )
}
