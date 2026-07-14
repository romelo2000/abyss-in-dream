import { useState } from 'react'
import { webGemini } from '../lib/abyssApi'

export function ApiKeyPrompt({ onComplete }: { onComplete: () => void }) {
  const [key, setKey] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = () => {
    if (!key.trim()) {
      setError('Вставь API ключ')
      return
    }
    if (webGemini) {
      webGemini.setApiKey(key.trim())
    }
    onComplete()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black animate-fade-in">
      <div className="glass rounded-2xl p-8 max-w-md w-full mx-4 animate-scale-in">
        <h2 className="text-2xl font-serif text-abyss-text mb-2">Ключ к Бездне</h2>
        <p className="text-abyss-text/60 text-sm mb-6">
          Бесплатный ключ исчерпан или заблокирован. Вставь свой — и Бездна снова заговорит.
        </p>

        <div className="space-y-4">
          <div>
            <label className="text-xs text-abyss-text/40 uppercase tracking-wider mb-1 block">
              Gemini API Key
            </label>
            <input
              type="password"
              value={key}
              onChange={(e) => { setKey(e.target.value); setError('') }}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              placeholder="AIza..."
              className="w-full bg-abyss-bg/50 border border-abyss-edge/30 rounded-lg px-4 py-3 text-abyss-text placeholder:text-abyss-text/20 focus:outline-none focus:border-abyss-accent/50 transition-colors"
              autoFocus
            />
            {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
          </div>

          <a
            href="https://aistudio.google.com/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="block text-center text-sm text-abyss-accent hover:text-abyss-accent/80 transition-colors"
          >
            Получить бесплатный ключ →
          </a>

          <button
            onClick={handleSubmit}
            className="w-full bg-abyss-accent/20 hover:bg-abyss-accent/30 border border-abyss-accent/40 text-abyss-text rounded-lg py-3 transition-all"
          >
            Отворить Бездну
          </button>
        </div>

        <p className="text-abyss-text/30 text-xs mt-4 text-center">
          Ключ хранится только в этом браузере. Никуда не отправляется.
        </p>
      </div>
    </div>
  )
}
