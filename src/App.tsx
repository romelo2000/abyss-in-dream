import { useState, useEffect, useCallback, useRef } from 'react'
import { AtmosphereBackground } from './components/AtmosphereBackground'
import { ChatView } from './components/ChatView'
import { ChatInput } from './components/ChatInput'
import { Sidebar } from './components/Sidebar'
import { MetricsPanel } from './components/MetricsPanel'
import { InsightsPanel } from './components/InsightsPanel'
import { SettingsPanel } from './components/SettingsPanel'
import { KoanOfDay } from './components/KoanOfDay'
import { AchievementsPanel } from './components/AchievementsPanel'
import { DreamLetter } from './components/DreamLetter'
import { BrokenMirrorsPanel } from './components/BrokenMirrorsPanel'
import { DreamInvasion } from './components/DreamInvasion'
import { DailyChallengeBanner } from './components/DailyChallengeBanner'
import { SetupWizard } from './components/SetupWizard'
import { AbyssEye, EyeState } from './components/AbyssEye'
import { BreathingGuide } from './components/BreathingGuide'
import { soundEngine, SoundPhase } from './lib/soundEngine'
import {
  Session,
  ChatMessage,
  Metrics,
  Insight,
  DREAM_SCENES,
  AbyssMode,
  PHASE_NAMES,
  PHASE_COLORS,
  MODES,
} from './lib/types'

const abyss = window.abyss

export default function App() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [currentSession, setCurrentSession] = useState<Session | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [streamingText, setStreamingText] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [insights, setInsights] = useState<Insight[]>([])
  const [showInsights, setShowInsights] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showAchievements, setShowAchievements] = useState(false)
  const [showDreamLetter, setShowDreamLetter] = useState(false)
  const [showBrokenMirrors, setShowBrokenMirrors] = useState(false)
  const [ollamaRunning, setOllamaRunning] = useState(false)
  const [currentModel, setCurrentModel] = useState('hermes3:70b-llama3.1-q3_K_M')
  const [currentSceneId, setCurrentSceneId] = useState('void')
  const [overallAwakening, setOverallAwakening] = useState(0)
  const [egoDeaths, setEgoDeaths] = useState(0)
  const [paradoxScore, setParadoxScore] = useState(0)
  const [karma, setKarma] = useState(0)
  const [sessionResult, setSessionResult] = useState<string | null>(null)
  const [showSetup, setShowSetup] = useState(false)
  const [phaseToast, setPhaseToast] = useState<string | null>(null)
  const [errorToast, setErrorToast] = useState<string | null>(null)
  const [modeToast, setModeToast] = useState<string | null>(null)
  const [soundOn, setSoundOn] = useState(false)
  const [showBreathing, setShowBreathing] = useState(false)
  const [microBreak, setMicroBreak] = useState(false)
  const [eyeState, setEyeState] = useState<EyeState>('sleeping')
  const prevPhaseRef = useRef<string | null>(null)
  const streamingSessionRef = useRef<number | null>(null)

  const currentScene = DREAM_SCENES.find(s => s.id === (currentSession?.dream_scene || currentSceneId)) || DREAM_SCENES[0]

  // Load initial data
  useEffect(() => {
    if (!abyss) {
      console.error('Abyss API not available — preload may have failed')
      return
    }
    loadSessions()
    loadSettings()
    checkOllama()
    loadInsights()
    loadAwakening()
    loadEgoDeaths()
    loadParadoxScore()
    loadKarma()

    // Check first run
    abyss.settings.get('setup_completed').then((completed) => {
      if (!completed) {
        setShowSetup(true)
      }
    })

    // Set up streaming listener
    if (abyss.chat?.onChunk) {
      abyss.chat.onChunk((data: { sessionId: number; chunk: string }) => {
        if (streamingSessionRef.current === data.sessionId) {
          setStreamingText(prev => prev + data.chunk)
        }
      })
    }

    if (abyss.chat?.onError) {
      abyss.chat.onError((data: { sessionId: number; error: string }) => {
        console.error('Chat error:', data.error)
        setIsStreaming(false)
        setStreamingText('')
        setErrorToast(`Бездна прервалась: ${data.error}`)
        setTimeout(() => setErrorToast(null), 6000)
      })
    }

    return () => {
      abyss.chat?.removeAllListeners?.()
    }
  }, [])

  // Sync eye state with ollama status
  useEffect(() => {
    if (!ollamaRunning) {
      setEyeState('sleeping')
    } else if (!isStreaming) {
      setEyeState(prev => prev === 'crisis' || prev === 'silence' || prev === 'egoDeath' || prev === 'insight' ? prev : 'listening')
    }
  }, [ollamaRunning, isStreaming])

  const loadSessions = async () => {
    const list = await abyss.session.list()
    setSessions(list)
    if (list.length > 0 && !currentSession) {
      selectSession(list[0].id)
    }
  }

  const loadSettings = async () => {
    const model = await abyss.settings.get('model')
    const scene = await abyss.settings.get('dream_scene')
    if (model) setCurrentModel(model)
    if (scene) setCurrentSceneId(scene)
  }

  const loadInsights = async () => {
    const list = await abyss.insight.list()
    setInsights(list)
  }

  const loadAwakening = async () => {
    const level = await abyss.awakening.get()
    setOverallAwakening(level)
  }

  const loadEgoDeaths = async () => {
    const count = await abyss.game.egoDeaths()
    setEgoDeaths(count)
  }

  const loadParadoxScore = async () => {
    const score = await abyss.game.paradoxScore()
    setParadoxScore(score)
  }

  const loadKarma = async () => {
    const k = await abyss.game.karma()
    setKarma(k)
  }

  const checkOllama = async () => {
    const status = await abyss.ollama.status()
    setOllamaRunning(status.running)
    if (!status.running) {
      const started = await abyss.ollama.start()
      if (started) setOllamaRunning(true)
    }
  }

  const selectSession = async (id: number) => {
    const session = await abyss.session.get(id)
    const msgs = await abyss.session.messages(id)
    const m = await abyss.metrics.get(id)
    setCurrentSession(session)
    setMessages(msgs)
    setMetrics(m)
  }

  const handleNewSession = async () => {
    const session = await abyss.session.create(currentSceneId, currentModel)
    setSessions(prev => [session, ...prev])
    setCurrentSession(session)
    setMessages([])
    setMetrics(null)
    setStreamingText('')
  }

  const handleSend = async (message: string, forceMode?: AbyssMode) => {
    if (!currentSession) {
      // Create session if none exists
      const session = await abyss.session.create(currentSceneId, currentModel)
      setSessions(prev => [session, ...prev])
      setCurrentSession(session)
      setMessages([])
      setMetrics(null)
      // Now send
      await sendMessage(session.id, message, forceMode)
      return
    }
    await sendMessage(currentSession.id, message, forceMode)
  }

  const sendMessage = async (sessionId: number, message: string, forceMode?: AbyssMode) => {
    // Add user message immediately
    const userMsg: ChatMessage = {
      id: Date.now(),
      session_id: sessionId,
      role: 'user',
      content: message,
      mode: null,
      timestamp: new Date().toISOString(),
    }
    setMessages(prev => [...prev, userMsg])

    setIsStreaming(true)
    setStreamingText('')
    streamingSessionRef.current = sessionId

    // Micro-break: Бездна всматривается
    const msgCount = messages.filter(m => m.role === 'user').length
    if (msgCount >= 4) {
      setMicroBreak(true)
      setEyeState('listening')
      await new Promise(r => setTimeout(r, 2500))
      setMicroBreak(false)
    }

    setEyeState('thinking')

    try {
      const result = await abyss.chat.send({
        sessionId,
        message,
        model: currentModel,
        forceMode,
      })

      // Add abyss message
      const abyssMsg: ChatMessage = {
        id: result.message.id,
        session_id: sessionId,
        role: 'abyss',
        content: result.message.content,
        mode: result.mode,
        timestamp: result.message.timestamp,
      }
      setMessages(prev => [...prev, abyssMsg])
      setStreamingText('')

      // Update metrics
      const m = await abyss.metrics.get(sessionId)
      setMetrics(m)

      // Update awakening
      const awakening = await abyss.awakening.update(sessionId)
      setOverallAwakening(await abyss.awakening.get())
      await loadEgoDeaths()
      await loadParadoxScore()
      await loadKarma()
      // Reload session to get updated phase
      const updatedSession = await abyss.session.get(sessionId)
      setCurrentSession(updatedSession)

      // Phase change notification
      if (updatedSession?.phase && prevPhaseRef.current !== updatedSession.phase) {
        if (prevPhaseRef.current !== null) {
          setPhaseToast(`Сессия перешла в фазу: ${PHASE_NAMES[updatedSession.phase]}`)
          setTimeout(() => setPhaseToast(null), 4000)
          soundEngine.playEvent('phaseShift')
          if (updatedSession.phase === 'crisis') setEyeState('crisis')
        }
        prevPhaseRef.current = updatedSession.phase
        soundEngine.setPhase(updatedSession.phase as SoundPhase)
      }

      // Mode description toast (only for auto-selected modes, not forced)
      if (!forceMode && result.mode && result.mode !== 'silence' && result.mode !== 'demo' && result.mode !== 'error') {
        const modeInfo = MODES.find(m => m.id === result.mode)
        if (modeInfo) {
          setModeToast(`${modeInfo.name}: ${modeInfo.description}`)
          setTimeout(() => setModeToast(null), 5000)
          soundEngine.playEvent('modeShift')
        }
      }

      // Silence mode
      if (result.mode === 'silence') {
        setEyeState('silence')
        soundEngine.playEvent('silence')
      } else if (result.mode !== 'error' && result.mode !== 'demo') {
        setEyeState(updatedSession?.phase === 'crisis' ? 'crisis' : 'thinking')
      }

      // Ego death sound
      await loadEgoDeaths()
      const newEgoDeaths = await abyss.game.egoDeaths()
      if (newEgoDeaths > egoDeaths) {
        soundEngine.playEvent('egoDeath')
        setEyeState('egoDeath')
        setTimeout(() => setEyeState(updatedSession?.phase === 'crisis' ? 'crisis' : 'listening'), 2000)
      }

    } catch (err) {
      console.error('Send error:', err)
    } finally {
      setIsStreaming(false)
      setStreamingText('')
      streamingSessionRef.current = null
      setEyeState(currentSession?.ended_at ? 'sleeping' : 'listening')
    }
  }

  const handleEndSession = async () => {
    if (!currentSession) return
    const result = await abyss.session.end(currentSession.id)
    await loadSessions()
    setOverallAwakening(await abyss.awakening.get())
    await loadEgoDeaths()
    await loadParadoxScore()
    await loadKarma()
    if (result?.result) {
      setSessionResult(result.result)
      setTimeout(() => setSessionResult(null), 5000)
    }
  }

  const handleDeleteSession = async (id: number) => {
    await abyss.session.delete(id)
    setSessions(prev => prev.filter(s => s.id !== id))
    if (currentSession?.id === id) {
      setCurrentSession(null)
      setMessages([])
      setMetrics(null)
    }
    setOverallAwakening(await abyss.awakening.get())
    await loadEgoDeaths()
    await loadParadoxScore()
    await loadKarma()
  }

  const handleSaveInsight = async (messageId: number, content: string) => {
    if (!currentSession) return
    await abyss.insight.save(currentSession.id, content)
    await loadInsights()
    soundEngine.playEvent('insight')
    setEyeState('insight')
    setTimeout(() => setEyeState(currentSession?.ended_at ? 'sleeping' : 'listening'), 1500)
  }

  const handleDeleteInsight = async (id: number) => {
    await abyss.insight.delete(id)
    setInsights(prev => prev.filter(i => i.id !== id))
  }

  const [mirrorPrompt, setMirrorPrompt] = useState<{ quote: string; mode: string } | null>(null)

  const handleBreakMirror = async (_messageId: number, quote: string, mode: string) => {
    if (!currentSession) return
    setMirrorPrompt({ quote, mode })
  }

  const handleMirrorSubmit = async (comment: string) => {
    if (!currentSession || !mirrorPrompt) return
    await abyss.mirror.save(currentSession.id, mirrorPrompt.quote, comment, mirrorPrompt.mode)
    setMirrorPrompt(null)
  }

  const handleExportBook = async () => {
    const path = await abyss.game.exportBook()
    if (path) {
      setToast(`Книга Бездны сохранена на рабочий стол: ${path}`)
    } else {
      setToast('Не удалось создать книгу. Бездна молчит.')
    }
  }

  const [toast, setToast] = useState('')

  const handleModelChange = async (model: string) => {
    setCurrentModel(model)
    await abyss.settings.set('model', model)
  }

  const handleSceneChange = async (scene: string) => {
    setCurrentSceneId(scene)
    await abyss.settings.set('dream_scene', scene)
  }

  const handleStartOllama = async () => {
    const started = await abyss.ollama.start()
    setOllamaRunning(started)
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      {showSetup && (
        <SetupWizard
          onComplete={(model) => {
            setCurrentModel(model)
            abyss.settings.set('setup_completed', 'true')
            setShowSetup(false)
            checkOllama()
          }}
        />
      )}
      {/* Atmospheric background */}
      <div style={{ opacity: Math.max(0.3, 1 - overallAwakening / 150) }}>
        <AtmosphereBackground scene={currentScene} />
      </div>

      {/* Sidebar */}
      <div className="relative z-10">
        <Sidebar
          sessions={sessions}
          currentSessionId={currentSession?.id ?? null}
          onSelectSession={selectSession}
          onNewSession={handleNewSession}
          onDeleteSession={handleDeleteSession}
          onShowInsights={() => setShowInsights(true)}
          onShowSettings={() => setShowSettings(true)}
          onShowAchievements={() => setShowAchievements(true)}
          onShowDreamLetter={() => setShowDreamLetter(true)}
          onShowBrokenMirrors={() => setShowBrokenMirrors(true)}
          onShowBook={handleExportBook}
          awakeningLevel={overallAwakening}
          egoDeaths={egoDeaths}
          paradoxScore={paradoxScore}
          karma={karma}
        />
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col relative z-10">
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-abyss-edge/20 glass window-drag">
          <div className="flex items-center gap-3 window-no-drag">
            <AbyssEye state={eyeState} size={40} />
            <span className="text-sm text-abyss-mist" data-tooltip="Текущая декорация сна">
              {currentScene.name}
            </span>
            {currentSession && (
              <span className="text-xs text-abyss-dim" data-tooltip="Активная модель ИИ">
                · {currentModel.split(':')[0]}
              </span>
            )}
            {currentSession && !currentSession.ended_at && currentSession.phase && (
              <span
                className="text-xs px-2 py-0.5 rounded"
                data-tooltip={`Фаза сессии: ${PHASE_NAMES[currentSession.phase]}`}
                style={{
                  color: PHASE_COLORS[currentSession.phase],
                  background: `${PHASE_COLORS[currentSession.phase]}15`,
                }}
              >
                {PHASE_NAMES[currentSession.phase]}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 window-no-drag">
            <button
              onClick={() => {
                if (soundOn) {
                  soundEngine.stop()
                  setSoundOn(false)
                } else {
                  soundEngine.start()
                  setSoundOn(true)
                  if (currentSession?.phase) {
                    soundEngine.setPhase(currentSession.phase as SoundPhase)
                  }
                }
              }}
              className="text-abyss-dim hover:text-abyss-text transition-colors"
              data-tooltip={soundOn ? 'Выключить звук Бездны' : 'Включить звук Бездны'}
            >
              {soundOn ? '🔊' : '🔇'}
            </button>
            <button
              onClick={() => setShowBreathing(!showBreathing)}
              className="text-abyss-dim hover:text-abyss-text transition-colors"
              data-tooltip={showBreathing ? 'Скрыть дыхательный гид' : 'Показать дыхательный гид'}
            >
              {showBreathing ? '◯' : '◐'}
            </button>
            <div className="flex items-center gap-2" data-tooltip={ollamaRunning ? 'Ollama работает — Бездна активна' : 'Ollama не запущена — Бездна спит'}>
              <div className={`w-2 h-2 rounded-full ${ollamaRunning ? 'bg-green-400' : 'bg-red-400'} animate-pulse`} />
              <span className="text-xs text-abyss-dim">
                {ollamaRunning ? 'Бездна пробудилась' : 'Бездна спит...'}
              </span>
            </div>
          </div>
        </div>

        {/* Koan of the Day */}
        <KoanOfDay />

        {/* Daily Challenge */}
        <DailyChallengeBanner sessionId={currentSession?.id ?? null} onAccept={() => {}} />

        {/* Chat + metrics */}
        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 flex flex-col">
            <ChatView
              messages={messages}
              streamingText={streamingText}
              isStreaming={isStreaming}
              onInsight={handleSaveInsight}
              onBreakMirror={handleBreakMirror}
            />
            <ChatInput
              onSend={handleSend}
              disabled={isStreaming || !ollamaRunning}
              onEndSession={handleEndSession}
              isStreaming={isStreaming}
            />
          </div>

          {/* Right panel - metrics */}
          {currentSession && (
            <div className="w-64 p-4 border-l border-abyss-edge/20 overflow-y-auto">
              <MetricsPanel metrics={metrics} overallAwakening={overallAwakening} />
            </div>
          )}
        </div>
      </div>

      {/* Breathing Guide */}
      {showBreathing && <BreathingGuide onClose={() => setShowBreathing(false)} />}

      {/* Micro-break overlay */}
      {microBreak && (
        <div className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none">
          <div className="text-center animate-fade-in">
            <div className="text-2xl text-abyss-mist mb-2 animate-breathe">◉</div>
            <p className="text-sm text-abyss-dim italic">Бездна всматривается в тебя...</p>
          </div>
        </div>
      )}

      {/* Modals */}
      {showInsights && (
        <InsightsPanel
          insights={insights}
          onClose={() => setShowInsights(false)}
          onDelete={handleDeleteInsight}
        />
      )}

      {showSettings && (
        <SettingsPanel
          currentModel={currentModel}
          currentScene={currentSceneId}
          ollamaRunning={ollamaRunning}
          onModelChange={handleModelChange}
          onSceneChange={handleSceneChange}
          onStartOllama={handleStartOllama}
          onClose={() => setShowSettings(false)}
        />
      )}

      {showAchievements && (
        <AchievementsPanel onClose={() => setShowAchievements(false)} />
      )}

      {showDreamLetter && (
        <DreamLetter onClose={() => setShowDreamLetter(false)} />
      )}

      {showBrokenMirrors && (
        <BrokenMirrorsPanel onClose={() => setShowBrokenMirrors(false)} />
      )}

      <DreamInvasion />

      {/* Mirror prompt modal */}
      {mirrorPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="glass rounded-xl p-6 max-w-md w-full mx-4 border border-abyss-edge/40">
            <p className="text-abyss-mist text-sm mb-2">Осколок зеркала:</p>
            <p className="text-abyss-text text-sm mb-4 italic">"{mirrorPrompt.quote}"</p>
            <input
              type="text"
              autoFocus
              placeholder="Твой комментарий к осколку..."
              className="w-full bg-abyss-deep/60 text-abyss-text rounded-lg px-4 py-2 border border-abyss-edge/30 outline-none focus:border-abyss-accent/50 mb-4"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleMirrorSubmit((e.target as HTMLInputElement).value)
                if (e.key === 'Escape') setMirrorPrompt(null)
              }}
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setMirrorPrompt(null)}
                className="px-4 py-2 text-sm text-abyss-dim hover:text-abyss-text"
              >
                Отмена
              </button>
              <button
                onClick={() => {
                  const input = document.querySelector('input[placeholder*="осколку"]') as HTMLInputElement
                  if (input) handleMirrorSubmit(input.value)
                }}
                className="px-4 py-2 text-sm bg-abyss-accent/20 text-abyss-text rounded-lg hover:bg-abyss-accent/30"
              >
                Разбить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-scale-in cursor-pointer"
          onClick={() => setToast('')}
        >
          <div className="glass rounded-xl px-6 py-3 border border-abyss-edge/40">
            <p className="text-sm text-abyss-text text-center">{toast}</p>
          </div>
        </div>
      )}

      {/* Session result toast */}
      {sessionResult && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-scale-in">
          <div
            className="glass rounded-xl px-6 py-4 border-2"
            style={{
              borderColor: sessionResult === 'win' ? '#d4a84360' : sessionResult === 'lose' ? '#c44d8b60' : '#6b6c9a60',
            }}
          >
            <p className="text-lg text-abyss-text text-center">
              {sessionResult === 'win' && '♛ Сессия выиграна. Ты вышел с инсайтом.'}
              {sessionResult === 'lose' && '⚑ Сессия проиграна. Но Бездна не обиделась.'}
              {sessionResult === 'draw' && '○ Ничья. Сон продолжается.'}
            </p>
          </div>
        </div>
      )}

      {/* Phase change toast */}
      {phaseToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-40 animate-scale-in">
          <div className="glass rounded-xl px-6 py-3 border border-abyss-glow/30">
            <p className="text-sm text-abyss-glow text-center">☉ {phaseToast}</p>
          </div>
        </div>
      )}

      {/* Mode description toast */}
      {modeToast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 animate-fade-in">
          <div className="glass rounded-xl px-5 py-2 border border-abyss-edge/30">
            <p className="text-xs text-abyss-mist text-center italic">{modeToast}</p>
          </div>
        </div>
      )}

      {/* Error toast */}
      {errorToast && (
        <div
          className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-scale-in cursor-pointer"
          onClick={() => setErrorToast(null)}
        >
          <div className="glass rounded-xl px-6 py-3 border border-red-400/30">
            <p className="text-sm text-red-300 text-center">⚠ {errorToast}</p>
          </div>
        </div>
      )}
    </div>
  )
}
