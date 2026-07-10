import { useState } from 'react'
import { Session, DREAM_SCENES, PHASE_NAMES, PHASE_COLORS, RESULT_NAMES, RESULT_COLORS } from '../lib/types'

interface Props {
  sessions: Session[]
  currentSessionId: number | null
  onSelectSession: (id: number) => void
  onNewSession: () => void
  onDeleteSession: (id: number) => void
  onShowInsights: () => void
  onShowSettings: () => void
  onShowAchievements: () => void
  onShowDreamLetter: () => void
  onShowBrokenMirrors: () => void
  onShowBook: () => void
  awakeningLevel: number
  egoDeaths: number
  paradoxScore: number
  karma: number
}

export function Sidebar({
  sessions,
  currentSessionId,
  onSelectSession,
  onNewSession,
  onDeleteSession,
  onShowInsights,
  onShowSettings,
  onShowAchievements,
  onShowDreamLetter,
  onShowBrokenMirrors,
  onShowBook,
  awakeningLevel,
  egoDeaths,
  paradoxScore,
  karma,
}: Props) {
  const [search, setSearch] = useState('')

  const filtered = sessions.filter(s => {
    if (!search) return true
    const scene = DREAM_SCENES.find(d => d.id === s.dream_scene)
    const text = `${s.title || ''} ${scene?.name || ''} ${s.created_at}`.toLowerCase()
    return text.includes(search.toLowerCase())
  })

  return (
    <div className="w-72 h-full glass border-r border-abyss-edge/30 flex flex-col">
      {/* Header */}
      <div className="p-5 border-b border-abyss-edge/20">
        <h1 className="text-xl gradient-text font-serif text-center">
          Бездна в Сне
        </h1>
        <p className="text-xs text-abyss-dim text-center mt-1 italic">
          Иллюзия, которая знает, что она иллюзия
        </p>
      </div>

      {/* Awakening level + Ego deaths */}
      <div className="px-5 py-3 border-b border-abyss-edge/20">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-abyss-dim">Пробуждённость</span>
          <span className="text-xs text-abyss-glow font-mono">{Math.round(awakeningLevel)}%</span>
        </div>
        <div className="h-1.5 bg-abyss-deep rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-1000"
            style={{
              width: `${awakeningLevel}%`,
              background: 'linear-gradient(90deg, #4d8bc4, #8b5cf6, #c44d8b, #d4a843)',
            }}
          />
        </div>
        {egoDeaths > 0 && (
          <div className="flex items-center gap-1 mt-2">
            <span className="text-xs text-abyss-dim">☠ Ego Death Counter:</span>
            <span className="text-xs text-abyss-glow font-mono">{egoDeaths}</span>
          </div>
        )}
        <div className="flex items-center gap-3 mt-1.5">
          {paradoxScore > 0 && (
            <div className="flex items-center gap-1">
              <span className="text-xs text-abyss-dim">◈ Парадоксы:</span>
              <span className="text-xs text-abyss-glow font-mono">{paradoxScore}</span>
            </div>
          )}
          {karma !== 0 && (
            <div className="flex items-center gap-1">
              <span className="text-xs text-abyss-dim">☯ Карма:</span>
              <span className="text-xs font-mono" style={{ color: karma > 0 ? '#d4a843' : '#c44d8b' }}>
                {karma > 0 ? '+' : ''}{karma}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* New session */}
      <div className="p-4">
        <button onClick={onNewSession} className="btn-abyss w-full">
          ✦ Новый сон
        </button>
      </div>

      {/* Search */}
      <div className="px-4 pb-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск по снам..."
          className="chat-input w-full rounded-lg px-3 py-2 text-sm"
        />
      </div>

      {/* Sessions list */}
      <div className="flex-1 overflow-y-auto px-3 space-y-1">
        {filtered.length === 0 && (
          <p className="text-center text-abyss-dim text-sm italic py-8">
            Снов пока нет. Всё начинается с первого.
          </p>
        )}
        {filtered.map((session) => {
          const scene = DREAM_SCENES.find(d => d.id === session.dream_scene)
          const isActive = session.id === currentSessionId
          const date = new Date(session.created_at).toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
          })
          return (
            <div
              key={session.id}
              onClick={() => onSelectSession(session.id)}
              className={`group p-3 rounded-lg cursor-pointer transition-all ${
                isActive
                  ? 'glass-light border border-abyss-glow/30'
                  : 'hover:bg-abyss-mid/30'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-abyss-text truncate">
                    {scene?.name || 'Сон'}
                  </p>
                  <p className="text-xs text-abyss-dim mt-0.5">{date}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {session.ended_at && session.result && (
                      <span
                        className="text-xs px-1.5 py-0.5 rounded"
                        style={{
                          color: RESULT_COLORS[session.result],
                          background: `${RESULT_COLORS[session.result]}15`,
                        }}
                      >
                        {RESULT_NAMES[session.result]}
                      </span>
                    )}
                    {!session.ended_at && session.phase && (
                      <span
                        className="text-xs px-1.5 py-0.5 rounded"
                        style={{
                          color: PHASE_COLORS[session.phase],
                          background: `${PHASE_COLORS[session.phase]}15`,
                        }}
                      >
                        {PHASE_NAMES[session.phase]}
                      </span>
                    )}
                    {session.ego_deaths > 0 && (
                      <span className="text-xs text-abyss-dim/60">☠ {session.ego_deaths}</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onDeleteSession(session.id)
                  }}
                  className="opacity-0 group-hover:opacity-100 text-abyss-dim hover:text-red-400 transition-all text-xs px-1"
                >
                  ✕
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-abyss-edge/20 space-y-2">
        <button onClick={onShowInsights} className="btn-ghost w-full text-sm">
          ✦ Инсайты
        </button>
        <button onClick={onShowBrokenMirrors} className="btn-ghost w-full text-sm">
          ◈ Разбитые Зеркала
        </button>
        <button onClick={onShowAchievements} className="btn-ghost w-full text-sm">
          ♛ Достижения
        </button>
        <button onClick={onShowDreamLetter} className="btn-ghost w-full text-sm">
          ☽ Письмо из сна
        </button>
        <button onClick={onShowBook} className="btn-ghost w-full text-sm">
          📖 Книга Бездны
        </button>
        <button onClick={onShowSettings} className="btn-ghost w-full text-sm">
          ⚙ Настройки
        </button>
      </div>
    </div>
  )
}
