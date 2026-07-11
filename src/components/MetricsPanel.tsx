import { Metrics, AWAKENING_LEVELS } from '../lib/types'

interface Props {
  metrics: Metrics | null
  overallAwakening: number
}

export function MetricsPanel({ metrics, overallAwakening }: Props) {
  const bars = [
    { label: 'Глубина', value: metrics?.depth ?? 0, color: '#4d8bc4', tooltip: 'Насколько глубоко ты погружаешься в диалог' },
    { label: 'Честность', value: metrics?.honesty ?? 0, color: '#c44d8b', tooltip: 'Насколько ты искренен с собой и Бездной' },
    { label: 'Гибкость ума', value: metrics?.flexibility ?? 0, color: '#8b5cf6', tooltip: 'Способность менять точку зрения' },
    { label: 'Осознанность', value: metrics?.mindfulness ?? 0, color: '#d4a843', tooltip: 'Внимание к настоящему моменту' },
  ]

  const currentLevel = AWAKENING_LEVELS.find(
    l => overallAwakening >= l.min && overallAwakening <= l.max
  ) || AWAKENING_LEVELS[0]

  return (
    <div className="glass rounded-xl p-5 space-y-4">
      <h3 className="text-sm text-abyss-mist uppercase tracking-wider">Метрики сессии</h3>

      <div className="space-y-3">
        {bars.map((bar) => (
          <div key={bar.label} data-tooltip={bar.tooltip} data-tooltip-bottom>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-abyss-dim">{bar.label}</span>
              <span className="text-xs font-mono text-abyss-text">{Math.round(bar.value)}</span>
            </div>
            <div className="h-1.5 bg-abyss-deep rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${bar.value}%`,
                  background: bar.color,
                }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="pt-3 border-t border-abyss-edge/20">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-abyss-dim">Уровень пробуждённости</span>
          <span className="text-xs font-mono text-abyss-glow">{Math.round(overallAwakening)}</span>
        </div>
        <div className="h-2 bg-abyss-deep rounded-full overflow-hidden mb-2">
          <div
            className="h-full rounded-full transition-all duration-1000"
            style={{
              width: `${overallAwakening}%`,
              background: 'linear-gradient(90deg, #4d8bc4, #8b5cf6, #c44d8b, #d4a843)',
            }}
          />
        </div>
        <p className="text-sm text-abyss-text italic">{currentLevel.name}</p>
        <p className="text-xs text-abyss-dim mt-0.5">{currentLevel.description}</p>
      </div>
    </div>
  )
}
