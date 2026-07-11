import { useState, useEffect } from 'react'
import { DailyChallenge } from '../lib/types'

interface Props {
  sessionId: number | null
  onAccept: (challengeId: string) => void
}

export function DailyChallengeBanner({ sessionId, onAccept }: Props) {
  const [challenge, setChallenge] = useState<DailyChallenge | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [accepted, setAccepted] = useState(false)

  useEffect(() => {
    const abyss = window.abyss
    if (!abyss?.game?.dailyChallenge) return
    abyss.game.dailyChallenge().then((c: DailyChallenge | null) => {
      if (c) setChallenge(c)
    }).catch(() => {})
  }, [])

  if (!challenge || dismissed) return null

  const handleAccept = async () => {
    if (!sessionId) return
    const abyss = window.abyss
    await abyss.game.setChallenge(sessionId, challenge.id)
    setAccepted(true)
    onAccept(challenge.id)
    setTimeout(() => setDismissed(true), 4000)
  }

  return (
    <div className="px-6 py-3 border-b border-abyss-edge/20 glass animate-fade-in-slow">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-abyss-gold text-sm">⚔</span>
            <span className="text-xs text-abyss-dim uppercase tracking-wider">Вызов Бездны</span>
          </div>
          <p className="text-sm text-abyss-text">
            <span className="text-abyss-gold">{challenge.name}</span> — {challenge.description}
          </p>
          <p className="text-xs text-abyss-mist italic mt-1">{challenge.hint}</p>
        </div>
        {!accepted ? (
          <div className="flex items-center gap-2">
            <button
              onClick={handleAccept}
              disabled={!sessionId}
              className="text-xs px-3 py-1.5 rounded-lg bg-abyss-glow/20 text-abyss-glow hover:bg-abyss-glow/30 transition-all disabled:opacity-30"
              data-tooltip="Принять вызов и попробовать выполнить его в этой сессии"
            >
              Принять
            </button>
            <button
              onClick={() => setDismissed(true)}
              className="text-abyss-dim hover:text-abyss-text transition-colors text-sm"
              data-tooltip="Отклонить вызов"
            >
              ✕
            </button>
          </div>
        ) : (
          <span className="text-xs text-abyss-glow animate-fade-in">✓ Принято</span>
        )}
      </div>
    </div>
  )
}
