import { useState, useRef, useEffect } from 'react'
import { MODES, AbyssMode } from '../lib/types'

interface Props {
  onSend: (message: string, forceMode?: AbyssMode) => void
  disabled: boolean
  onEndSession: () => void
  isStreaming: boolean
}

export function ChatInput({ onSend, disabled, onEndSession, isStreaming }: Props) {
  const [text, setText] = useState('')
  const [showModes, setShowModes] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const modePanelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`
    }
  }, [text])

  useEffect(() => {
    if (!showModes) return
    const handleClickOutside = (e: MouseEvent) => {
      if (modePanelRef.current && !modePanelRef.current.contains(e.target as Node)) {
        setShowModes(false)
      }
    }
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowModes(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [showModes])

  const handleSend = () => {
    if (!text.trim() || disabled) return
    onSend(text.trim())
    setText('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleModeSelect = (mode: AbyssMode) => {
    const msg = text.trim() || '...'
    onSend(msg, mode)
    setText('')
    setShowModes(false)
  }

  return (
    <div className="px-6 pb-6 pt-2">
      <div className="relative">
        {showModes && (
          <div ref={modePanelRef} className="absolute bottom-full left-0 right-0 mb-2 glass rounded-xl p-3 animate-scale-in">
            <div className="flex items-center justify-between mb-2 px-1">
              <p className="text-xs text-abyss-dim">Принудительный режим Бездны:</p>
              <button
                onClick={() => setShowModes(false)}
                className="text-abyss-dim hover:text-abyss-text transition-colors text-sm"
                data-tooltip="Закрыть панель режимов"
              >
                ✕
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {MODES.map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => handleModeSelect(mode.id)}
                  disabled={disabled}
                  className="text-left p-2 rounded-lg hover:bg-abyss-mid/50 transition-colors disabled:opacity-30"
                  data-tooltip={mode.description}
                >
                  <div className="text-sm text-abyss-text">{mode.name}</div>
                  <div className="text-xs text-abyss-dim">{mode.description}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-end gap-3">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={disabled}
              placeholder="Спроси Бездну. Или расскажи ей свой сон. Или просто скажи «я здесь»..."
              className="chat-input w-full rounded-xl px-4 py-3 min-h-[50px] max-h-[150px]"
              rows={1}
            />
          </div>

          <button
            onClick={() => setShowModes(!showModes)}
            className="btn-ghost h-[50px] px-3"
            data-tooltip="Выбрать режим Бездны принудительно"
            data-tooltip-bottom
          >
            ◈
          </button>

          <button
            onClick={handleSend}
            disabled={!text.trim() || disabled}
            className="btn-abyss h-[50px] px-5 disabled:opacity-30"
            data-tooltip="Отправить сообщение Бездне"
            data-tooltip-bottom
          >
            {isStreaming ? '...' : '→'}
          </button>

          <button
            onClick={onEndSession}
            disabled={isStreaming}
            className="btn-ghost h-[50px] px-3 disabled:opacity-30"
            data-tooltip="Закончить сессию и подвести итог"
            data-tooltip-bottom
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  )
}
