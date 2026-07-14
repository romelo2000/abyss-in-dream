// Pure frontend API — no server needed, everything runs in browser
// Uses BrowserDB (localStorage), BrowserGemini (direct API calls), AbyssEngine (imported directly)

import { BrowserDB } from './browserDb'
import { BrowserGemini } from './browserGemini'
import { BrowserMemory } from './browserMemory'
import { AbyssEngine } from '../../electron/abyss'
import { AbyssMode, ACHIEVEMENTS } from '../../electron/shared-types'

const db = new BrowserDB()
const gemini = new BrowserGemini()
const memory = new BrowserMemory(db)
const abyss = new AbyssEngine(gemini as any, db as any, memory as any)

db.init().then(() => {
  console.log('BrowserDB initialized')
})

// Chunk callbacks for streaming
const chunkCallbacks: ((data: { sessionId: number; chunk: string }) => void)[] = []
const errorCallbacks: ((data: { sessionId: number; error: string }) => void)[] = []
const statusCallbacks: ((data: { sessionId: number; status: string }) => void)[] = []

export const webApi = {
  // Expose for settings UI
  _gemini: gemini,
  _db: db,

  ollama: {
    status: () => gemini.checkStatus(),
    models: () => gemini.listModels(),
    start: () => Promise.resolve({ success: true }),
    isInstalled: () => Promise.resolve(true),
    hasModel: (_model: string) => Promise.resolve(true),
    pullModel: async () => true,
    onPullProgress: () => () => {},
  },
  session: {
    create: (dreamScene: string, model: string) => Promise.resolve(db.createSession(dreamScene, model)),
    list: () => Promise.resolve(db.listSessions()),
    get: (id: number) => Promise.resolve(db.getSession(id) || null),
    messages: (id: number) => Promise.resolve(db.getSessionMessages(id)),
    delete: (id: number) => Promise.resolve(db.deleteSession(id)),
    end: (id: number) => {
      const result = abyss.onSessionEnd(id)
      db.endSession(id)
      return Promise.resolve({ result, awakening: db.getAwakeningLevel() })
    },
    exportMd: (sessionId: number) => {
      const session = db.getSession(sessionId)
      if (!session) return Promise.resolve(null)

      const messages = db.getSessionMessages(sessionId)
      const metrics = db.getMetrics(sessionId)

      let md = `# Бездна в Сне — Сессия #${session.id}\n\n`
      md += `**Дата:** ${new Date(session.created_at).toLocaleString('ru-RU')}\n`
      if (session.ended_at) md += `**Завершена:** ${new Date(session.ended_at).toLocaleString('ru-RU')}\n`
      if (session.phase) md += `**Фаза:** ${session.phase}\n`
      if (session.dream_scene) md += `**Сцена:** ${session.dream_scene}\n`
      if (session.ego_deaths) md += `**Ego Deaths:** ${session.ego_deaths}\n`
      md += `\n---\n\n`

      for (const msg of messages) {
        const time = new Date(msg.timestamp).toLocaleTimeString('ru-RU')
        if (msg.role === 'user') {
          md += `### 👤 Ты — ${time}\n\n${msg.content}\n\n`
        } else {
          const modeLabel = msg.mode ? ` *(${msg.mode})*` : ''
          md += `### ◉ Бездна — ${time}${modeLabel}\n\n${msg.content}\n\n`
        }
      }

      if (metrics) {
        md += `---\n\n## Метрики\n\n`
        md += `- Глубина: ${metrics.depth ?? 0}/100\n`
        md += `- Честность: ${metrics.honesty ?? 0}/100\n`
        md += `- Гибкость: ${metrics.flexibility ?? 0}/100\n`
        md += `- Осознанность: ${metrics.mindfulness ?? 0}/100\n`
        md += `- Пробуждение: ${metrics.awakening_level ?? 0}/100\n`
      }

      const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Бездна-сессия-${sessionId}.md`
      a.click()
      URL.revokeObjectURL(url)
      return Promise.resolve(null)
    },
  },
  chat: {
    send: async (data: { sessionId: number; message: string; model: string; forceMode?: string; responseTimeMs?: number }) => {
      const { sessionId, message, model, forceMode, responseTimeMs } = data

      try {
        db.addMessage(sessionId, 'user', message, null)
        const history = db.getSessionMessages(sessionId)
        const memoryContext = await memory.getRelevantMemory(message, sessionId)
        const userPatterns = memory.getUserPatterns()
        const mode = (forceMode || abyss.selectMode(message, history, userPatterns, responseTimeMs)) as AbyssMode

        const status = await gemini.checkStatus()
        if (!status.running) {
          const demoResponse = abyss.getDemoResponse(message, mode)
          chunkCallbacks.forEach(cb => cb({ sessionId, chunk: demoResponse }))
          const abyssMsg = db.addMessage(sessionId, 'abyss', demoResponse, 'demo')
          abyss.updateMetrics(sessionId, message, demoResponse, mode, 0)
          return { message: abyssMsg, mode: 'demo', shadow: null }
        }

        const session = db.getSession(sessionId)
        const echoText = abyss.getEchoText(sessionId)
        const dreamVoice = abyss.getDreamVoice()
        const karmaMsg = abyss.getKarmaMessage(sessionId)
        const userMsgCount = history.filter(m => m.role === 'user').length
        const shouldSilence = userMsgCount >= 2 && abyss.shouldSilence()
        const shadowEcho = db.getShadowEcho(sessionId)
        const dreamWithinDream = abyss.shouldDreamWithinDream()
        const wordPriceHint = abyss.getWordPriceHint(userMsgCount)
        const shouldMirror = abyss.shouldOfferMirror(sessionId, userMsgCount)
        const shouldCouncil = abyss.shouldCouncil(userMsgCount)
        let challengePrompt = ''
        if (session?.challenge_id) {
          challengePrompt = abyss.getChallengePrompt(session.challenge_id)
        }

        let systemPrompt = abyss.buildSystemPrompt(mode, memoryContext, userPatterns, history, session, echoText, dreamVoice)
        if (shadowEcho) systemPrompt += `\n\n${shadowEcho}`
        if (dreamWithinDream) systemPrompt += `\n\nСОН ВНУТРИ СНА: ${abyss.getDreamWithinDreamPrompt()}`
        if (shouldMirror) {
          systemPrompt += abyss.getMirrorOfTruthPrompt(sessionId)
          db.setMirrorUsed(sessionId)
        }
        if (shouldCouncil) systemPrompt += abyss.getCouncilPrompt()
        if (challengePrompt) systemPrompt += challengePrompt

        const responseChunks: string[] = []

        if (shouldSilence) {
          const silenceMsg = abyss.getSilenceMessage()
          db.incrementSilence(sessionId)
          chunkCallbacks.forEach(cb => cb({ sessionId, chunk: silenceMsg }))
          const abyssMsg = db.addMessage(sessionId, 'abyss', silenceMsg, 'silence')
          abyss.updateMetrics(sessionId, message, silenceMsg, mode, userMsgCount)
          return { message: abyssMsg, mode: 'silence', shadow: null }
        }

        if (karmaMsg) {
          chunkCallbacks.forEach(cb => cb({ sessionId, chunk: karmaMsg + '\n\n' }))
          responseChunks.push(karmaMsg + '\n\n')
        }

        if (wordPriceHint) {
          chunkCallbacks.forEach(cb => cb({ sessionId, chunk: wordPriceHint + '\n\n' }))
          responseChunks.push(wordPriceHint + '\n\n')
        }

        statusCallbacks.forEach(cb => cb({ sessionId, status: 'loading-model' }))

        for await (const chunk of gemini.chatStream(model, systemPrompt, history, message)) {
          responseChunks.push(chunk)
          chunkCallbacks.forEach(cb => cb({ sessionId, chunk }))
        }

        const fullResponse = responseChunks.join('')
        const shadowMatch = fullResponse.match(/\[shadow\](.*?)\[\/shadow\]/is)
        const shadowText = shadowMatch ? shadowMatch[1].trim() : null
        const cleanResponse = fullResponse.replace(/\[shadow\].*?\[\/shadow\]/gis, '').trim()

        const abyssMsg = db.addMessage(sessionId, 'abyss', cleanResponse, mode)
        memory.processInteraction(message, fullResponse, sessionId, mode).catch(() => {})
        abyss.updateMetrics(sessionId, message, fullResponse, mode, userMsgCount)

        return { message: abyssMsg, mode, shadow: shadowText }
      } catch (err) {
        const errorMsg = String(err)
        errorCallbacks.forEach(cb => cb({ sessionId, error: errorMsg }))
        throw err
      }
    },
    onChunk: (cb: (data: { sessionId: number; chunk: string }) => void) => {
      chunkCallbacks.push(cb)
    },
    onError: (cb: (data: { sessionId: number; error: string }) => void) => {
      errorCallbacks.push(cb)
    },
    onStatus: (cb: (data: { sessionId: number; status: string }) => void) => {
      statusCallbacks.push(cb)
    },
    removeAllListeners: () => {
      chunkCallbacks.length = 0
      errorCallbacks.length = 0
      statusCallbacks.length = 0
    },
  },
  metrics: {
    get: (sessionId: number) => Promise.resolve(db.getMetrics(sessionId) || null),
    all: () => Promise.resolve(db.getAllMetrics()),
  },
  insight: {
    save: (sessionId: number, content: string) => Promise.resolve(db.saveInsight(sessionId, content)),
    list: (sessionId?: number) => Promise.resolve(db.listInsights(sessionId)),
    delete: (id: number) => Promise.resolve(db.deleteInsight(id)),
  },
  memory: {
    search: (_query: string) => Promise.resolve([]),
    patterns: () => Promise.resolve(db.getUserPatterns()),
    welcome: () => Promise.resolve(memory.getWelcomeMessage()),
    echoKeywords: (sessionId: number) => {
      const candidates = db.getEchoCandidates(sessionId, 5)
      const keywords = new Set<string>()
      for (const msg of candidates) {
        const words = msg.content
          .toLowerCase()
          .replace(/[^\p{L}\s]/gu, ' ')
          .split(/\s+/)
          .filter((w: string) => w.length >= 4 && w.length <= 20)
        for (const w of words) keywords.add(w)
      }
      return Promise.resolve(Array.from(keywords).slice(0, 15))
    },
  },
  settings: {
    get: (key: string) => Promise.resolve(db.getSetting(key)),
    set: (key: string, value: string) => { db.setSetting(key, value); return Promise.resolve(true) },
  },
  awakening: {
    get: () => Promise.resolve(db.getAwakeningLevel()),
    update: (sessionId: number) => Promise.resolve(abyss.calculateAwakening(sessionId)),
  },
  game: {
    achievements: () => {
      const unlocked = db.getAchievements()
      return Promise.resolve(ACHIEVEMENTS.map((a: any) => {
        const u = unlocked.find(x => x.id === a.id)
        return { ...a, unlocked: u?.unlocked || false, unlocked_at: u?.unlocked_at || null }
      }))
    },
    koanOfDay: () => Promise.resolve(db.getKoanOfDay()),
    egoDeaths: () => Promise.resolve(db.getTotalEgoDeaths()),
    weeklyStats: () => Promise.resolve(db.getWeeklyStats()),
    sessionResult: (sessionId: number) => Promise.resolve(abyss.determineGameResult(sessionId)),
    paradoxScore: () => Promise.resolve(db.getTotalParadoxScore()),
    karma: () => Promise.resolve(db.getTotalKarma()),
    dreamInvasion: () => Promise.resolve(abyss.getDreamInvasion()),
    dailyChallenge: () => Promise.resolve(db.getDailyChallenge()),
    setChallenge: (sessionId: number, challengeId: string) => {
      abyss.setSessionChallenge(sessionId, challengeId)
      return Promise.resolve(true)
    },
    exportBook: () => {
      const sessions = db.listSessions()
      const mirrors = db.listBrokenMirrors()
      const awakening = db.getAwakeningLevel()
      const egoDeaths = db.getTotalEgoDeaths()
      const paradoxScore = db.getTotalParadoxScore()
      const karma = db.getTotalKarma()
      // exportBook uses Node.js pdfmake — skip in browser for now
      return Promise.resolve(null)
    },
  },
  mirror: {
    save: (sessionId: number, quote: string, comment: string, mode: string) =>
      Promise.resolve(abyss.saveBrokenMirror(sessionId, quote, comment, mode)),
    list: () => Promise.resolve(db.listBrokenMirrors()),
    delete: (id: number) => Promise.resolve(db.deleteBrokenMirror(id)),
  },
}
