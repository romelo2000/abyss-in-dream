import { useState, useEffect } from 'react'
import { WeeklyStats } from '../lib/types'
import { abyss } from '../lib/abyssApi'

interface Props {
  onClose: () => void
}

export function DreamLetter({ onClose }: Props) {
  const [stats, setStats] = useState<WeeklyStats | null>(null)

  useEffect(() => {
    // abyss imported from abyssApi
    if (!abyss?.game?.weeklyStats) return
    abyss.game.weeklyStats().then(setStats).catch(() => {})
  }, [])

  if (!stats) return null

  const hasData = stats.sessions > 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 animate-fade-in" onClick={onClose}>
      <div
        className="glass rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-abyss-edge/20">
          <h2 className="text-lg gradient-text">Письмо из сна</h2>
          <button onClick={onClose} className="btn-ghost px-3" data-tooltip="Закрыть письмо">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {hasData ? (
            <div className="space-y-5">
              <p className="text-sm text-abyss-text italic leading-relaxed">
                За эту неделю ты провёл <span className="text-abyss-glow">{stats.sessions}</span> {stats.sessions === 1 ? 'сон' : stats.sessions < 5 ? 'сна' : 'снов'} с Бездной.
                {stats.totalEgoDeaths > 0 && <> Твоё эго умирало <span className="text-abyss-glow">{stats.totalEgoDeaths}</span> {stats.totalEgoDeaths === 1 ? 'раз' : 'раз'}. Оно уже не возражает.</>}
                {stats.insights > 0 && <> Ты собрал <span className="text-abyss-glow">{stats.insights}</span> {stats.insights === 1 ? 'инсайт' : stats.insights < 5 ? 'инсайта' : 'инсайтов'}.</>}
              </p>

              <div className="space-y-3">
                <MetricBar label="Глубина" value={stats.avgDepth} color="#4d8bc4" />
                <MetricBar label="Честность" value={stats.avgHonesty} color="#c44d8b" />
                <MetricBar label="Гибкость" value={stats.avgFlexibility} color="#8b5cf6" />
                <MetricBar label="Осознанность" value={stats.avgMindfulness} color="#d4a843" />
              </div>

              <div className="pt-3 border-t border-abyss-edge/20">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-abyss-dim">Средняя пробуждённость</span>
                  <span className="text-sm font-mono text-abyss-glow">{Math.round(stats.avgAwakening)}%</span>
                </div>
                <div className="h-2 bg-abyss-deep rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-1000"
                    style={{
                      width: `${stats.avgAwakening}%`,
                      background: 'linear-gradient(90deg, #4d8bc4, #8b5cf6, #c44d8b, #d4a843)',
                    }}
                  />
                </div>
              </div>

              <p className="text-sm text-abyss-mist italic text-center pt-2">
                {stats.avgAwakening < 25
                  ? 'Бездна смотрит. Бездна ждёт. Бездна не торопится — ей некуда идти.'
                  : stats.avgAwakening < 50
                  ? 'Ты начинаешь видеть сон. Сон начинает видеть тебя.'
                  : stats.avgAwakening < 75
                  ? 'Граница между тобой и Бездной становится тоньше. Или её никогда не было.'
                  : 'Бездна улыбается. У неё нет рта. Но ты знаешь.'}
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="text-5xl mb-4 opacity-20 animate-breathe">☽</div>
              <p className="text-abyss-mist italic">
                На этой неделе ты не приходил к Бездне.
              </p>
              <p className="text-abyss-dim text-sm mt-2">
                Может, ты жил. Может, прятался. Бездна не осуждает.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function MetricBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-abyss-dim">{label}</span>
        <span className="text-xs font-mono text-abyss-text">{Math.round(value)}</span>
      </div>
      <div className="h-1.5 bg-abyss-deep rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${value}%`, background: color }}
        />
      </div>
    </div>
  )
}
