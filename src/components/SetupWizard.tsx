import { useState, useEffect, useRef } from 'react'
import { AVAILABLE_MODELS } from '../lib/types'
import { abyss } from '../lib/abyssApi'

// abyss imported from abyssApi

type Step = 'checking' | 'no-ollama' | 'ollama-starting' | 'select-model' | 'pulling' | 'ready' | 'skip'

const MODEL_OPTIONS = [
  { id: 'hermes3:70b-llama3.1-q3_K_M', name: 'Hermes 3 70B', description: 'Максимальная глубина. Лучший roleplay. ~32 GB RAM', ram: '~32 GB', recommended: true },
  { id: 'qwen3:30b-a3b-thinking-2507-q4_K_M', name: 'Qwen 3 30B MoE', description: 'Быстрая, умная, «размышляет». ~18 GB RAM', ram: '~18 GB' },
  { id: 'qwen2.5:7b-instruct-q4_K_M', name: 'Qwen 2.5 7B', description: 'Лёгкая и быстрая. Для слабых машин. ~5 GB RAM', ram: '~5 GB' },
]

export function SetupWizard({ onComplete }: { onComplete: (model: string) => void }) {
  const [step, setStep] = useState<Step>('checking')
  const [installedModels, setInstalledModels] = useState<string[]>([])
  const [selectedModel, setSelectedModel] = useState('')
  const [pullProgress, setPullProgress] = useState('')
  const [ollamaInstalled, setOllamaInstalled] = useState(false)
  const [error, setError] = useState('')
  const progressRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    runCheck()
    const cleanup = abyss.ollama.onPullProgress((data) => {
      setPullProgress(data.progress)
    })
    return () => { cleanup }
  }, [])

  const runCheck = async () => {
    setStep('checking')
    setError('')

    // Check if Ollama is installed
    const installed = await abyss.ollama.isInstalled()
    setOllamaInstalled(installed)

    if (!installed) {
      setStep('no-ollama')
      return
    }

    // Try to start Ollama
    setStep('ollama-starting')
    const started = await abyss.ollama.start()
    if (!started) {
      setError('Не удалось запустить Ollama. Попробуйте запустить вручную.')
      setStep('no-ollama')
      return
    }

    // Check installed models
    const models = await abyss.ollama.models()
    const modelNames = models.map((m: any) => m.name)
    setInstalledModels(modelNames)

    // Check if any of our recommended models are already installed
    const hasRecommended = MODEL_OPTIONS.find(m => modelNames.includes(m.id))
    if (hasRecommended) {
      setSelectedModel(hasRecommended.id)
      setStep('ready')
      return
    }

    setStep('select-model')
  }

  const handlePull = async (modelId: string) => {
    setStep('pulling')
    setSelectedModel(modelId)
    setPullProgress('Загрузка модели...')
    const ok = await abyss.ollama.pullModel(modelId)
    if (ok) {
      setStep('ready')
    } else {
      setError('Не удалось загрузить модель. Проверьте интернет-соединение.')
      setStep('select-model')
    }
  }

  const handleComplete = () => {
    abyss.settings.set('model', selectedModel)
    onComplete(selectedModel)
  }

  const handleSkip = () => {
    if (selectedModel) {
      abyss.settings.set('model', selectedModel)
    }
    onComplete(selectedModel || 'hermes3:70b-llama3.1-q3_K_M')
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#05060f]">
      <div className="max-w-2xl w-full mx-4">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4 opacity-80">◉</div>
          <h1 className="text-3xl font-light text-abyss-text tracking-wide">Бездна в Сне</h1>
          <p className="text-abyss-mist text-sm mt-2">Философская игра с локальным ИИ</p>
        </div>

        <div className="glass rounded-2xl p-8 border border-abyss-edge/30">
          {/* Step: checking */}
          {step === 'checking' && (
            <div className="text-center py-8">
              <div className="inline-block w-8 h-8 border-2 border-abyss-accent border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-abyss-mist">Проверка системы...</p>
            </div>
          )}

          {/* Step: ollama-starting */}
          {step === 'ollama-starting' && (
            <div className="text-center py-8">
              <div className="inline-block w-8 h-8 border-2 border-abyss-accent border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-abyss-mist">Запуск Ollama...</p>
            </div>
          )}

          {/* Step: no-ollama */}
          {step === 'no-ollama' && (
            <div className="py-4">
              <h2 className="text-xl text-abyss-text mb-4">Ollama не найдена</h2>
              <p className="text-abyss-mist text-sm mb-4">
                Для работы игры нужен <span className="text-abyss-accent">Ollama</span> — локальный LLM-сервер.
              </p>
              <div className="bg-abyss-deep/40 rounded-lg p-4 mb-4">
                <p className="text-abyss-text text-sm mb-2">Установка:</p>
                <p className="text-abyss-mist text-xs mb-1">macOS:</p>
                <code className="text-abyss-accent text-xs block mb-2">brew install ollama</code>
                <p className="text-abyss-mist text-xs mb-1">Windows:</p>
                <code className="text-abyss-accent text-xs block">winget install Ollama.Ollama</code>
                <p className="text-abyss-mist text-xs mt-2">Или скачайте с <span className="text-abyss-accent">ollama.com</span></p>
              </div>
              {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
              <div className="flex gap-3">
                <button
                  onClick={runCheck}
                  className="flex-1 py-3 bg-abyss-accent/20 text-abyss-text rounded-lg hover:bg-abyss-accent/30 transition"
                >
                  Проверить снова
                </button>
                <button
                  onClick={handleSkip}
                  className="px-6 py-3 text-abyss-dim hover:text-abyss-text transition"
                >
                  Пропустить
                </button>
              </div>
            </div>
          )}

          {/* Step: select-model */}
          {step === 'select-model' && (
            <div className="py-4">
              <h2 className="text-xl text-abyss-text mb-2">Выбери модель Бездны</h2>
              <p className="text-abyss-mist text-sm mb-6">
                Модель определяет «ум» Бездны. Больше = умнее, но медленнее.
              </p>
              <div className="space-y-3 mb-6">
                {MODEL_OPTIONS.map((model) => (
                  <button
                    key={model.id}
                    onClick={() => handlePull(model.id)}
                    className="w-full text-left p-4 rounded-xl border border-abyss-edge/20 hover:border-abyss-accent/40 hover:bg-abyss-deep/30 transition group"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-abyss-text font-medium flex items-center gap-2">
                        {model.name}
                        {model.recommended && (
                          <span className="text-xs px-2 py-0.5 rounded bg-abyss-accent/20 text-abyss-accent">Рекомендуется</span>
                        )}
                      </span>
                      <span className="text-xs text-abyss-dim">{model.ram}</span>
                    </div>
                    <p className="text-abyss-mist text-sm">{model.description}</p>
                    {installedModels.includes(model.id) && (
                      <p className="text-green-400 text-xs mt-1">✓ Уже установлена</p>
                    )}
                  </button>
                ))}
              </div>
              {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
              <button
                onClick={handleSkip}
                className="w-full py-2 text-abyss-dim hover:text-abyss-text text-sm transition"
              >
                Выбрать позже (демо-режим)
              </button>
            </div>
          )}

          {/* Step: pulling */}
          {step === 'pulling' && (
            <div className="py-8">
              <div className="text-center mb-6">
                <div className="inline-block w-8 h-8 border-2 border-abyss-accent border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-abyss-text mb-2">Загрузка модели...</p>
                <p className="text-abyss-mist text-sm">
                  {MODEL_OPTIONS.find(m => m.id === selectedModel)?.name || selectedModel}
                </p>
              </div>
              <div className="bg-abyss-deep/40 rounded-lg p-4 max-h-32 overflow-y-auto" ref={progressRef}>
                <pre className="text-abyss-mist text-xs whitespace-pre-wrap font-mono">{pullProgress}</pre>
              </div>
              <p className="text-abyss-dim text-xs text-center mt-4">
                Это может занять несколько минут в зависимости от размера модели и скорости интернета
              </p>
            </div>
          )}

          {/* Step: ready */}
          {step === 'ready' && (
            <div className="py-8 text-center">
              <div className="text-5xl mb-4">✦</div>
              <h2 className="text-xl text-abyss-text mb-2">Бездна пробудилась</h2>
              <p className="text-abyss-mist text-sm mb-6">
                Модель: {MODEL_OPTIONS.find(m => m.id === selectedModel)?.name || selectedModel}
              </p>
              <button
                onClick={handleComplete}
                className="px-8 py-3 bg-abyss-accent/20 text-abyss-text rounded-xl hover:bg-abyss-accent/30 transition text-lg"
              >
                Войти в Бездну
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-abyss-dim text-xs mt-6">
          Всё работает локально. Ваши данные не покидают устройство.
        </p>
      </div>
    </div>
  )
}
