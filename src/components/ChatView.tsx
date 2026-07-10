import { useState, useRef, useEffect, useCallback } from 'react'
import { ChatMessage, MODE_NAMES, MODE_COLORS } from '../lib/types'

interface Props {
  messages: ChatMessage[]
  streamingText: string
  isStreaming: boolean
  onInsight: (messageId: number, content: string) => void
  onBreakMirror: (messageId: number, quote: string, mode: string) => void
}

export function ChatView({ messages, streamingText, isStreaming, onInsight, onBreakMirror }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [hoveredMsg, setHoveredMsg] = useState<number | null>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, streamingText])

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto px-6 py-8 space-y-6"
    >
      {messages.length === 0 && !isStreaming && (
        <div className="flex flex-col items-center justify-center h-full text-center animate-fade-in-slow">
          <div className="text-6xl mb-6 opacity-20 animate-breathe">◉</div>
          <p className="text-abyss-mist text-lg italic max-w-md">
            Бездна молчит. Она всегда молчит — пока ты не заговоришь первым.
          </p>
          <p className="text-abyss-dim text-sm mt-4">
            Напиши «Бездна, я здесь» чтобы начать. Или просто скажи, что у тебя на душе.
          </p>
        </div>
      )}

      {messages.map((msg) => (
        <div
          key={msg.id}
          className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-slide-up`}
          onMouseEnter={() => setHoveredMsg(msg.id)}
          onMouseLeave={() => setHoveredMsg(null)}
        >
          <div
            className={`max-w-[75%] ${msg.role === 'user' ? 'ml-12' : 'mr-12'}`}
          >
            {msg.role === 'abyss' && msg.mode && (
              <div className="flex items-center gap-2 mb-1.5">
                <span
                  className="mode-badge"
                  style={{
                    color: msg.mode === 'silence' ? '#6b6c9a' : MODE_COLORS[msg.mode] || '#8b8cc4',
                    background: msg.mode === 'silence' ? '#6b6c9a15' : `${MODE_COLORS[msg.mode] || '#8b8cc4'}15`,
                    border: `1px solid ${msg.mode === 'silence' ? '#6b6c9a30' : `${MODE_COLORS[msg.mode] || '#8b8cc4'}30`}`,
                  }}
                >
                  {msg.mode === 'silence' ? 'Молчание' : MODE_NAMES[msg.mode] || msg.mode}
                </span>
              </div>
            )}
            <div
              className={`rounded-2xl px-5 py-3 ${
                msg.role === 'user'
                  ? 'glass-light user-text'
                  : 'glass abyss-text'
              }`}
              style={{
                borderColor:
                  msg.role === 'abyss' && msg.mode
                    ? `${MODE_COLORS[msg.mode] || '#3d3e80'}25`
                    : undefined,
              }}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
            </div>
            {msg.role === 'abyss' && hoveredMsg === msg.id && msg.mode !== 'silence' && (
              <div className="flex items-center gap-3 mt-1 ml-2">
                <button
                  onClick={() => onInsight(msg.id, msg.content)}
                  className="text-xs text-abyss-dim hover:text-abyss-gold transition-colors"
                >
                  ✦ Инсайт
                </button>
                <button
                  onClick={() => onBreakMirror(msg.id, msg.content, msg.mode || '')}
                  className="text-xs text-abyss-dim hover:text-abyss-glow transition-colors"
                >
                  ◈ Разбить зеркало
                </button>
              </div>
            )}
          </div>
        </div>
      ))}

      {isStreaming && (
        <div className="flex justify-start animate-fade-in">
          <div className="max-w-[75%] mr-12">
            {streamingText ? (
              <div className="glass abyss-text rounded-2xl px-5 py-3">
                <p className="whitespace-pre-wrap">{streamingText}</p>
              </div>
            ) : (
              <div className="glass rounded-2xl px-5 py-4">
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="typing-dot" />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
