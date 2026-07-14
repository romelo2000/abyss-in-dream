import { useState } from 'react'
import { webGemini } from '../lib/abyssApi'

export function ApiKeyPrompt({ onComplete }: { onComplete: () => void }) {
  const [key, setKey] = useState('')
  const [error, setError] = useState('')
  const [showHelp, setShowHelp] = useState(false)

  const handleSubmit = () => {
    if (!key.trim()) {
      setError('Вставь ключ сюда')
      return
    }
    if (webGemini) {
      webGemini.setApiKey(key.trim())
    }
    onComplete()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black animate-fade-in overflow-y-auto py-8">
      <div className="glass rounded-2xl p-8 max-w-md w-full mx-4 animate-scale-in my-auto">
        {/* Eye */}
        <div className="text-center mb-6">
          <div className="text-5xl mb-2">◉</div>
          <h2 className="text-2xl font-serif text-abyss-text">Бездна ждёт</h2>
          <p className="text-abyss-text/50 text-sm mt-1">Чтобы начать разговор, нужен ключ</p>
        </div>

        {/* Key input */}
        <div className="space-y-4">
          <div>
            <label className="text-xs text-abyss-text/40 uppercase tracking-wider mb-1 block">
              Ключ от Gemini
            </label>
            <input
              type="password"
              value={key}
              onChange={(e) => { setKey(e.target.value); setError('') }}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              placeholder="Вставь ключ сюда..."
              className="w-full bg-abyss-bg/50 border border-abyss-edge/30 rounded-lg px-4 py-3 text-abyss-text placeholder:text-abyss-text/20 focus:outline-none focus:border-abyss-accent/50 transition-colors"
              autoFocus
            />
            {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
          </div>

          <button
            onClick={handleSubmit}
            className="w-full bg-abyss-accent/20 hover:bg-abyss-accent/30 border border-abyss-accent/40 text-abyss-text rounded-lg py-3 transition-all font-medium"
          >
            Отворить Бездну
          </button>

          {/* Help toggle */}
          <button
            onClick={() => setShowHelp(!showHelp)}
            className="w-full text-center text-sm text-abyss-accent/70 hover:text-abyss-accent transition-colors"
          >
            {showHelp ? 'Скрыть инструкцию' : 'Как получить ключ? Показать инструкцию'}
          </button>

          {/* Instructions */}
          {showHelp && (
            <div className="bg-abyss-bg/40 rounded-lg p-4 space-y-3 text-sm text-abyss-text/70 border border-abyss-edge/20">
              <div>
                <p className="text-abyss-text font-medium mb-1">Что это за ключ?</p>
                <p className="text-abyss-text/60 text-xs leading-relaxed">
                  Gemini — это бесплатный искусственный интеллект от Google. Ключ — это как пароль. Он позволяет игре общаться с этим интеллектом. Без ключа Бездна молчит.
                </p>
              </div>

              <div className="border-t border-abyss-edge/10 pt-3">
                <p className="text-abyss-text font-medium mb-2">Как получить ключ — пошагово:</p>
                <ol className="space-y-2 text-xs leading-relaxed text-abyss-text/60">
                  <li className="flex gap-2">
                    <span className="text-abyss-accent font-bold shrink-0">1.</span>
                    <span>Нажми на ссылку ниже. Откроется сайт Google AI Studio.</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-abyss-accent font-bold shrink-0">2.</span>
                    <span>Нажми <span className="text-abyss-text">«Get API Key»</span> (получить ключ).</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-abyss-accent font-bold shrink-0">3.</span>
                    <span>Если попросит — войди через свой Google-аккаунт (Gmail). Это как войти в почту.</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-abyss-accent font-bold shrink-0">4.</span>
                    <span>Нажми <span className="text-abyss-text">«Create API Key»</span> (создать ключ).</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-abyss-accent font-bold shrink-0">5.</span>
                    <span>Появится длинная строка с буквами и цифрами. Скопируй её.</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-abyss-accent font-bold shrink-0">6.</span>
                    <span>Вернись сюда, вставь её в поле выше и нажми «Отворить Бездну».</span>
                  </li>
                </ol>
              </div>

              <div className="border-t border-abyss-edge/10 pt-3">
                <p className="text-abyss-text/50 text-xs leading-relaxed">
                  Это бесплатно. Google даёт ключ без оплаты. Ключ хранится только в твоём браузере — никто его не увидит. Можно удалить в любой момент.
                </p>
              </div>
            </div>
          )}

          {/* Link */}
          <a
            href="https://aistudio.google.com/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="block text-center text-sm text-abyss-accent hover:text-abyss-accent/80 transition-colors py-2"
          >
            Открыть Google AI Studio →
          </a>
        </div>

        <p className="text-abyss-text/30 text-xs mt-4 text-center">
          Ключ хранится только в этом браузере. Никуда не отправляется.
        </p>
      </div>
    </div>
  )
}
