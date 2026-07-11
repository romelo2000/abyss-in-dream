import { useState } from 'react'
import { DREAM_SCENES, AVAILABLE_MODELS, DreamScene } from '../lib/types'

interface Props {
  currentModel: string
  currentScene: string
  ollamaRunning: boolean
  onModelChange: (model: string) => void
  onSceneChange: (scene: string) => void
  onStartOllama: () => void
  onClose: () => void
}

export function SettingsPanel({
  currentModel,
  currentScene,
  ollamaRunning,
  onModelChange,
  onSceneChange,
  onStartOllama,
  onClose,
}: Props) {
  const [tab, setTab] = useState<'model' | 'scene'>('model')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 animate-fade-in" onClick={onClose}>
      <div
        className="glass rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-abyss-edge/20">
          <h2 className="text-lg gradient-text">Настройки сна</h2>
          <button onClick={onClose} className="btn-ghost px-3" data-tooltip="Закрыть настройки">✕</button>
        </div>

        {/* Ollama status */}
        <div className="px-5 py-3 border-b border-abyss-edge/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${ollamaRunning ? 'bg-green-400' : 'bg-red-400'} animate-pulse`} />
              <span className="text-sm text-abyss-text">
                Ollama {ollamaRunning ? 'работает' : 'не работает'}
              </span>
            </div>
            {!ollamaRunning && (
              <button onClick={onStartOllama} className="btn-abyss text-sm" data-tooltip="Запустить локальный сервер Ollama">
                Запустить
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 px-5 pt-4">
          <button
            onClick={() => setTab('model')}
            className={`px-4 py-2 rounded-lg text-sm transition-all ${
              tab === 'model' ? 'glass-light text-abyss-text' : 'text-abyss-dim hover:text-abyss-text'
            }`}
            data-tooltip="Выбор языковой модели для Бездны"
          >
            Модель ИИ
          </button>
          <button
            onClick={() => setTab('scene')}
            className={`px-4 py-2 rounded-lg text-sm transition-all ${
              tab === 'scene' ? 'glass-light text-abyss-text' : 'text-abyss-dim hover:text-abyss-text'
            }`}
            data-tooltip="Выбор визуальной атмосферы сна"
          >
            Декорация сна
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {tab === 'model' && (
            <div className="space-y-3">
              <p className="text-sm text-abyss-dim mb-3">
                Выбери модель для Бездны. От неё зависит скорость и глубина ответов.
              </p>
              {AVAILABLE_MODELS.map((model) => (
                <button
                  key={model.id}
                  onClick={() => onModelChange(model.id)}
                  className={`w-full text-left p-4 rounded-xl transition-all ${
                    currentModel === model.id
                      ? 'glass-light border border-abyss-glow/40'
                      : 'glass-light border border-transparent hover:border-abyss-edge/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-abyss-text">{model.name}</p>
                      <p className="text-xs text-abyss-dim mt-0.5">{model.description}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-abyss-dim font-mono">{model.ram}</span>
                      {currentModel === model.id && (
                        <p className="text-xs text-abyss-glow mt-1">✓ выбрана</p>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {tab === 'scene' && (
            <div className="grid grid-cols-2 gap-3">
              <p className="col-span-2 text-sm text-abyss-dim mb-1">
                Выбери декорацию сна. Она меняет атмосферу вокруг чата.
              </p>
              {DREAM_SCENES.map((scene: DreamScene) => (
                <button
                  key={scene.id}
                  onClick={() => onSceneChange(scene.id)}
                  className={`text-left p-4 rounded-xl transition-all ${
                    currentScene === scene.id
                      ? 'glass-light border-2'
                      : 'glass-light border border-transparent hover:border-abyss-edge/30'
                  }`}
                  style={{
                    borderColor: currentScene === scene.id ? `${scene.colors.accent}60` : undefined,
                  }}
                >
                  <div
                    className="w-full h-12 rounded-lg mb-2"
                    style={{
                      background: `radial-gradient(ellipse at center, ${scene.colors.secondary}, ${scene.colors.primary})`,
                    }}
                  />
                  <p className="text-sm text-abyss-text">{scene.name}</p>
                  <p className="text-xs text-abyss-dim mt-0.5">{scene.description}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
