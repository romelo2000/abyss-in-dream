import { useState, useEffect } from 'react'
import { BrokenMirror, MODE_NAMES, MODE_COLORS } from '../lib/types'

interface Props {
  onClose: () => void
}

export function BrokenMirrorsPanel({ onClose }: Props) {
  const [mirrors, setMirrors] = useState<BrokenMirror[]>([])

  useEffect(() => {
    const abyss = window.abyss
    if (!abyss?.mirror?.list) return
    abyss.mirror.list().then(setMirrors).catch(() => {})
  }, [])

  const handleDelete = async (id: number) => {
    const abyss = window.abyss
    if (!abyss?.mirror?.delete) return
    await abyss.mirror.delete(id).catch(() => {})
    setMirrors(prev => prev.filter(m => m.id !== id))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 animate-fade-in" onClick={onClose}>
      <div
        className="glass rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-abyss-edge/20">
          <div>
            <h2 className="text-lg gradient-text">Разбитые Зеркала</h2>
            <p className="text-xs text-abyss-dim mt-1">
              Осколки инсайтов. {mirrors.length} {mirrors.length === 1 ? 'осколок' : mirrors.length < 5 ? 'осколка' : 'осколков'}
            </p>
          </div>
          <button onClick={onClose} className="btn-ghost px-3">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {mirrors.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="text-5xl mb-4 opacity-20 animate-breathe">◈</div>
              <p className="text-abyss-mist italic">
                Зеркала пока целы. Разобьёшь — осколки останутся здесь.
              </p>
              <p className="text-abyss-dim text-sm mt-2">
                Наведи на ответ Бездны и сохрани как разбитое зеркало.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {mirrors.map((m) => {
                const modeColor = MODE_COLORS[m.mode] || '#6b6c9a'
                const modeName = MODE_NAMES[m.mode] || m.mode
                return (
                  <div
                    key={m.id}
                    className="glass-light rounded-xl p-5 border border-abyss-edge/20 group relative hover:border-abyss-glow/30 transition-all"
                    style={{ borderLeft: `3px solid ${modeColor}` }}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <span
                        className="text-xs px-2 py-0.5 rounded"
                        style={{ color: modeColor, background: `${modeColor}15` }}
                      >
                        {modeName}
                      </span>
                      <span className="text-xs text-abyss-dim">
                        {new Date(m.timestamp).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                    <p className="text-sm text-abyss-text italic mb-3 leading-relaxed">
                      «{m.quote}»
                    </p>
                    {m.comment && (
                      <p className="text-xs text-abyss-mist border-t border-abyss-edge/10 pt-2 mt-2">
                        {m.comment}
                      </p>
                    )}
                    <button
                      onClick={() => handleDelete(m.id)}
                      className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 text-abyss-dim hover:text-red-400 transition-all text-xs"
                    >
                      ✕
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
