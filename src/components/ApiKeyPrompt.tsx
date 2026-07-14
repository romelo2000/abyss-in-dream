import { useState } from 'react'
import { webGemini, webLLM, setLLMMode } from '../lib/abyssApi'

export function ApiKeyPrompt({ onComplete }: { onComplete: () => void }) {
  const [mode, setMode] = useState<'webllm' | 'gemini'>('webllm')
  const [key, setKey] = useState('')
  const [error, setError] = useState('')
  const [showHelp, setShowHelp] = useState(false)
  const [webgpuSupported, setWebgpuSupported] = useState<boolean | null>(null)

  // Check WebGPU support on mount
  useState(() => {
    if (typeof navigator !== 'undefined' && 'gpu' in navigator) {
      setWebgpuSupported(true)
    } else {
      setWebgpuSupported(false)
      setMode('gemini')
    }
  })

  const handleSubmit = () => {
    if (mode === 'gemini') {
      if (!key.trim()) {
        setError('Вставь ключ сюда')
        return
      }
      if (webGemini) {
        webGemini.setApiKey(key.trim())
      }
      if (setLLMMode) setLLMMode('gemini')
    } else {
      if (setLLMMode) setLLMMode('webllm')
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
          <p className="text-abyss-text/50 text-sm mt-1">Выбери, как говорить с Бездной</p>
        </div>

        {/* Mode selection */}
        <div className="space-y-3 mb-4">
          {/* WebLLM option */}
          <button
            onClick={() => setMode('webllm')}
            disabled={!webgpuSupported}
            className={`w-full text-left rounded-lg p-4 border transition-all ${
              mode === 'webllm'
                ? 'bg-abyss-accent/20 border-abyss-accent/50'
                : 'bg-abyss-bg/30 border-abyss-edge/20 hover:border-abyss-edge/40'
            } ${!webgpuSupported ? 'opacity-40 cursor-not-allowed' : ''}`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className={`w-4 h-4 rounded-full border-2 shrink-0 ${
                mode === 'webllm' ? 'border-abyss-accent bg-abyss-accent' : 'border-abyss-text/30'
              }`} />
              <span className="text-abyss-text font-medium text-sm">Без ключа (в браузере)</span>
            </div>
            <p className="text-abyss-text/50 text-xs leading-relaxed pl-6">
              Модель работает прямо в браузере. Бесплатно, без регистрации. При первом запуске скачается ~500 МБ. Нужен Chrome или Edge.
            </p>
            {!webgpuSupported && (
              <p className="text-red-400/70 text-xs pl-6 mt-1">
                Не поддерживается в этом браузере. Используй Chrome или Edge на компьютере.
              </p>
            )}
          </button>

          {/* Gemini option */}
          <button
            onClick={() => setMode('gemini')}
            className={`w-full text-left rounded-lg p-4 border transition-all ${
              mode === 'gemini'
                ? 'bg-abyss-accent/20 border-abyss-accent/50'
                : 'bg-abyss-bg/30 border-abyss-edge/20 hover:border-abyss-edge/40'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className={`w-4 h-4 rounded-full border-2 shrink-0 ${
                mode === 'gemini' ? 'border-abyss-accent bg-abyss-accent' : 'border-abyss-text/30'
              }`} />
              <span className="text-abyss-text font-medium text-sm">Через Gemini (умнее)</span>
            </div>
            <p className="text-abyss-text/50 text-xs leading-relaxed pl-6">
              Подключение к Google Gemini. Ответы качественнее, работает на любом устройстве. Нужен бесплатный API ключ.
            </p>
          </button>
        </div>

        {/* Gemini key input */}
        {mode === 'gemini' && (
          <div className="space-y-3 mb-4 animate-fade-in">
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
              onClick={() => setShowHelp(!showHelp)}
              className="w-full text-center text-sm text-abyss-accent/70 hover:text-abyss-accent transition-colors"
            >
              {showHelp ? 'Скрыть инструкцию' : 'Как получить ключ? Показать инструкцию'}
            </button>

            {showHelp && (
              <div className="bg-abyss-bg/40 rounded-lg p-4 space-y-3 text-sm text-abyss-text/70 border border-abyss-edge/20">
                <div>
                  <p className="text-abyss-text font-medium mb-1">Что это за ключ?</p>
                  <p className="text-abyss-text/60 text-xs leading-relaxed">
                    Gemini — это бесплатный искусственный интеллект от Google. Ключ — это как пароль. Он позволяет игре общаться с этим интеллектом.
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
                      <span>Если попросит — войди через свой Google-аккаунт (Gmail).</span>
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
                    Это бесплатно. Google даёт ключ без оплаты. Ключ хранится только в твоём браузере.
                  </p>
                </div>
              </div>
            )}

            <a
              href="https://aistudio.google.com/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="block text-center text-sm text-abyss-accent hover:text-abyss-accent/80 transition-colors py-2"
            >
              Открыть Google AI Studio →
            </a>
          </div>
        )}

        {/* WebLLM info */}
        {mode === 'webllm' && webgpuSupported && (
          <div className="bg-abyss-bg/40 rounded-lg p-3 mb-4 border border-abyss-edge/20">
            <p className="text-abyss-text/50 text-xs leading-relaxed">
              При первом сообщении Бездна скачает модель (~500 МБ) и запустит её в браузере. Это займёт около минуты. Дальше всё работает мгновенно и без интернета.
            </p>
          </div>
        )}

        {/* Submit button */}
        <button
          onClick={handleSubmit}
          className="w-full bg-abyss-accent/20 hover:bg-abyss-accent/30 border border-abyss-accent/40 text-abyss-text rounded-lg py-3 transition-all font-medium"
        >
          Отворить Бездну
        </button>

        <p className="text-abyss-text/30 text-xs mt-4 text-center">
          {mode === 'gemini'
            ? 'Ключ хранится только в этом браузере. Никуда не отправляется.'
            : 'Модель работает локально. Данные не покидают браузер.'}
        </p>
      </div>
    </div>
  )
}
