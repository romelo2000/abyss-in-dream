import { useState, useEffect } from 'react'
import { Achievement } from '../lib/types'

interface Props {
  onClose: () => void
}

export function AchievementsPanel({ onClose }: Props) {
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [egoDeaths, setEgoDeaths] = useState(0)

  useEffect(() => {
    const abyss = window.abyss
    if (!abyss?.game) return
    abyss.game.achievements?.()?.then(setAchievements).catch(() => {})
    abyss.game.egoDeaths?.()?.then(setEgoDeaths).catch(() => {})
  }, [])

  const unlocked = achievements.filter(a => a.unlocked)
  const locked = achievements.filter(a => !a.unlocked)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 animate-fade-in" onClick={onClose}>
      <div
        className="glass rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-abyss-edge/20">
          <div>
            <h2 className="text-lg gradient-text">Достижения</h2>
            <p className="text-xs text-abyss-dim mt-1">
              Открыто: {unlocked.length} / {achievements.length} · ☠ Эго умирало: {egoDeaths} раз
            </p>
          </div>
          <button onClick={onClose} className="btn-ghost px-3">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {unlocked.length > 0 && (
            <div>
              <h3 className="text-xs text-abyss-glow uppercase tracking-wider mb-3">Открытые</h3>
              <div className="grid grid-cols-2 gap-3">
                {unlocked.map((a) => (
                  <div key={a.id} className="glass-light rounded-xl p-4 border border-abyss-glow/20">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl text-abyss-glow">{a.icon}</span>
                      <div>
                        <p className="text-sm text-abyss-text">{a.name}</p>
                        <p className="text-xs text-abyss-dim mt-0.5">{a.description}</p>
                        {a.unlocked_at && (
                          <p className="text-xs text-abyss-dim/50 mt-1">
                            {new Date(a.unlocked_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {locked.length > 0 && (
            <div>
              <h3 className="text-xs text-abyss-dim uppercase tracking-wider mb-3">Закрытые</h3>
              <div className="grid grid-cols-2 gap-3">
                {locked.map((a) => (
                  <div key={a.id} className="glass-light rounded-xl p-4 opacity-50">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl text-abyss-dim">{a.icon}</span>
                      <div>
                        <p className="text-sm text-abyss-dim">{a.name}</p>
                        <p className="text-xs text-abyss-dim/60 mt-0.5">{a.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
