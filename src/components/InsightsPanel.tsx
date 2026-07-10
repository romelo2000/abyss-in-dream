import { useState } from 'react'
import { Insight } from '../lib/types'

interface Props {
  insights: Insight[]
  onClose: () => void
  onDelete: (id: number) => void
}

export function InsightsPanel({ insights, onClose, onDelete }: Props) {
  const [search, setSearch] = useState('')

  const filtered = insights.filter(i =>
    i.content.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 animate-fade-in" onClick={onClose}>
      <div
        className="glass rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-abyss-edge/20">
          <h2 className="text-lg gradient-text">Инсайты из снов</h2>
          <button onClick={onClose} className="btn-ghost px-3">✕</button>
        </div>

        <div className="p-4 border-b border-abyss-edge/20">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск инсайтов..."
            className="chat-input w-full rounded-lg px-3 py-2 text-sm"
          />
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {filtered.length === 0 && (
            <p className="text-center text-abyss-dim italic py-8">
              {insights.length === 0
                ? 'Инсайтов пока нет. Наведи на сообщение Бездны и нажми «Записать как инсайт».'
                : 'Ничего не найдено.'}
            </p>
          )}
          {filtered.map((insight) => (
            <div key={insight.id} className="group glass-light rounded-lg p-4">
              <p className="abyss-text text-sm text-abyss-text">{insight.content}</p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-abyss-dim">
                  {new Date(insight.timestamp).toLocaleDateString('ru-RU', {
                    day: 'numeric',
                    month: 'long',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
                <button
                  onClick={() => onDelete(insight.id)}
                  className="opacity-0 group-hover:opacity-100 text-xs text-abyss-dim hover:text-red-400 transition-all"
                >
                  удалить
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
