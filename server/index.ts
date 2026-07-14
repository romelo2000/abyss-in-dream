import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import http from 'http'
import { DatabaseManager } from '../electron/database'
import { MemorySystem } from '../electron/memory'
import { AbyssEngine } from '../electron/abyss'
import { GeminiClient } from './gemini'
import { AbyssMode, SessionPhase } from '../electron/shared-types'

const app = express()
const server = http.createServer(app)
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json({ limit: '10mb' }))

// Init
const db = new DatabaseManager(process.env.DB_PATH || './data/abyss.db')
const gemini = new GeminiClient()
const memory = new MemorySystem(db, gemini as any)
const abyss = new AbyssEngine(gemini as any, db, memory)

db.init().then(() => {
  console.log('Database initialized')
})

// === Ollama/Groq status ===
app.get('/api/ollama/status', async (_req, res) => {
  const status = await gemini.checkStatus()
  res.json(status)
})

app.get('/api/ollama/models', async (_req, res) => {
  res.json(await gemini.listModels())
})

app.post('/api/ollama/start', async (_req, res) => {
  res.json({ success: true })
})

app.get('/api/ollama/is-installed', async (_req, res) => {
  res.json(true)
})

app.post('/api/ollama/has-model', async (req, res) => {
  const { model } = req.body
  res.json(await gemini.hasModel(model))
})

// === Sessions ===
app.post('/api/session/create', async (req, res) => {
  const { dreamScene, model } = req.body
  const session = db.createSession(dreamScene, model)
  res.json(session)
})

app.get('/api/session/list', async (_req, res) => {
  res.json(db.listSessions())
})

app.get('/api/session/:id', async (req, res) => {
  const session = db.getSession(Number(req.params.id))
  res.json(session || null)
})

app.get('/api/session/:id/messages', async (req, res) => {
  res.json(db.getSessionMessages(Number(req.params.id)))
})

app.delete('/api/session/:id', async (req, res) => {
  db.deleteSession(Number(req.params.id))
  res.json(true)
})

app.post('/api/session/:id/end', async (req, res) => {
  const id = Number(req.params.id)
  const result = abyss.onSessionEnd(id)
  db.endSession(id)
  res.json({ result, awakening: db.getAwakeningLevel() })
})

app.get('/api/session/:id/export-md', async (req, res) => {
  const sessionId = Number(req.params.id)
  const session = db.getSession(sessionId)
  if (!session) { res.status(404).json(null); return }

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

  res.setHeader('Content-Type', 'text/markdown; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="Бездна-сессия-${sessionId}.md"`)
  res.send(md)
})

// === Chat (SSE streaming) ===
app.post('/api/chat/send', async (req, res) => {
  const { sessionId, message, model, forceMode, responseTimeMs } = req.body

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  const sendSSE = (event: string, data: any) => {
    res.write(`event: ${event}\n`)
    res.write(`data: ${JSON.stringify(data)}\n\n`)
  }

  try {
    const userMsg = db.addMessage(sessionId, 'user', message, null)
    const history = db.getSessionMessages(sessionId)
    const memoryContext = await memory.getRelevantMemory(message, sessionId)
    const userPatterns = memory.getUserPatterns()
    const mode = (forceMode || abyss.selectMode(message, history, userPatterns, responseTimeMs)) as AbyssMode

    const status = await gemini.checkStatus()
    if (!status.running) {
      const demoResponse = abyss.getDemoResponse(message, mode)
      sendSSE('chunk', { chunk: demoResponse })
      const abyssMsg = db.addMessage(sessionId, 'abyss', demoResponse, 'demo')
      abyss.updateMetrics(sessionId, message, demoResponse, mode, 0)
      sendSSE('done', { message: abyssMsg, mode: 'demo' })
      res.end()
      return
    }

    const session = db.getSession(sessionId)
    const echoText = abyss.getEchoText(sessionId)
    const dreamVoice = abyss.getDreamVoice()
    const karmaMsg = abyss.getKarmaMessage(sessionId)
    const userMsgCount = history.filter(m => m.role === 'user').length
    const shouldSilence = userMsgCount >= 2 && abyss.shouldSilence()
    const shadowEcho = abyss.getShadowEcho(sessionId)
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
      sendSSE('chunk', { chunk: silenceMsg })
      const abyssMsg = db.addMessage(sessionId, 'abyss', silenceMsg, 'silence')
      abyss.updateMetrics(sessionId, message, silenceMsg, mode, userMsgCount)
      sendSSE('done', { message: abyssMsg, mode: 'silence' })
      res.end()
      return
    }

    if (karmaMsg) {
      sendSSE('chunk', { chunk: karmaMsg + '\n\n' })
      responseChunks.push(karmaMsg + '\n\n')
    }

    if (wordPriceHint) {
      sendSSE('chunk', { chunk: wordPriceHint + '\n\n' })
      responseChunks.push(wordPriceHint + '\n\n')
    }

    sendSSE('status', { status: 'loading-model' })

    for await (const chunk of gemini.chatStream(model, systemPrompt, history, message)) {
      responseChunks.push(chunk)
      sendSSE('chunk', { chunk })
    }

    const fullResponse = responseChunks.join('')
    const shadowMatch = fullResponse.match(/\[shadow\](.*?)\[\/shadow\]/is)
    const shadowText = shadowMatch ? shadowMatch[1].trim() : null
    const cleanResponse = fullResponse.replace(/\[shadow\].*?\[\/shadow\]/gis, '').trim()

    const abyssMsg = db.addMessage(sessionId, 'abyss', cleanResponse, mode)
    memory.processInteraction(message, fullResponse, sessionId, mode).catch(() => {})
    abyss.updateMetrics(sessionId, message, fullResponse, mode, userMsgCount)

    sendSSE('done', { message: abyssMsg, mode, shadow: shadowText })
  } catch (err) {
    sendSSE('error', { error: String(err) })
  }

  res.end()
})

// === Metrics ===
app.get('/api/metrics/:sessionId', async (req, res) => {
  res.json(db.getMetrics(Number(req.params.sessionId)) || null)
})

app.get('/api/metrics', async (_req, res) => {
  res.json(db.getAllMetrics())
})

// === Insights ===
app.post('/api/insight/save', async (req, res) => {
  const { sessionId, content } = req.body
  res.json(db.saveInsight(sessionId, content))
})

app.get('/api/insight/list', async (req, res) => {
  const sessionId = req.query.sessionId ? Number(req.query.sessionId) : undefined
  res.json(db.listInsights(sessionId))
})

app.delete('/api/insight/:id', async (req, res) => {
  db.deleteInsight(Number(req.params.id))
  res.json(true)
})

// === Memory ===
app.post('/api/memory/search', async (req, res) => {
  res.json(await memory.searchMemory(req.body.query))
})

app.get('/api/memory/patterns', async (_req, res) => {
  res.json(memory.getUserPatterns())
})

app.get('/api/memory/welcome', async (_req, res) => {
  res.json(memory.getWelcomeMessage())
})

app.get('/api/memory/echo-keywords/:sessionId', async (req, res) => {
  const sessionId = Number(req.params.sessionId)
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
  res.json(Array.from(keywords).slice(0, 15))
})

// === Settings ===
app.get('/api/settings/:key', async (req, res) => {
  res.json(db.getSetting(req.params.key))
})

app.post('/api/settings', async (req, res) => {
  const { key, value } = req.body
  db.setSetting(key, value)
  res.json(true)
})

// === Awakening ===
app.get('/api/awakening', async (_req, res) => {
  res.json(db.getAwakeningLevel())
})

app.post('/api/awakening/update', async (req, res) => {
  const { sessionId } = req.body
  res.json(await abyss.calculateAwakening(sessionId))
})

// === Game ===
app.get('/api/game/achievements', async (_req, res) => {
  const unlocked = db.getAchievements()
  const { ACHIEVEMENTS } = require('../electron/shared-types')
  res.json(ACHIEVEMENTS.map((a: any) => {
    const u = unlocked.find(x => x.id === a.id)
    return { ...a, unlocked: u?.unlocked || false, unlocked_at: u?.unlocked_at || null }
  }))
})

app.get('/api/game/koan-of-day', async (_req, res) => {
  res.json(db.getKoanOfDay())
})

app.get('/api/game/ego-deaths', async (_req, res) => {
  res.json(db.getTotalEgoDeaths())
})

app.get('/api/game/weekly-stats', async (_req, res) => {
  res.json(db.getWeeklyStats())
})

app.get('/api/game/session-result/:sessionId', async (req, res) => {
  res.json(abyss.determineGameResult(Number(req.params.sessionId)))
})

app.get('/api/game/paradox-score', async (_req, res) => {
  res.json(db.getTotalParadoxScore())
})

app.get('/api/game/karma', async (_req, res) => {
  res.json(db.getTotalKarma())
})

app.get('/api/game/dream-invasion', async (_req, res) => {
  res.json(abyss.getDreamInvasion())
})

app.get('/api/game/daily-challenge', async (_req, res) => {
  res.json(abyss.getDailyChallenge())
})

app.post('/api/game/set-challenge', async (req, res) => {
  const { sessionId, challengeId } = req.body
  abyss.setSessionChallenge(sessionId, challengeId)
  res.json(true)
})

app.get('/api/game/export-book', async (_req, res) => {
  const sessions = db.listSessions()
  const mirrors = db.listBrokenMirrors()
  const awakening = db.getAwakeningLevel()
  const egoDeaths = db.getTotalEgoDeaths()
  const paradoxScore = db.getTotalParadoxScore()
  const karma = db.getTotalKarma()
  const { exportBook } = require('../electron/exportBook')
  const result = exportBook(sessions, mirrors, awakening, egoDeaths, paradoxScore, karma)
  res.json(result)
})

// === Broken Mirrors ===
app.post('/api/mirror/save', async (req, res) => {
  const { sessionId, quote, comment, mode } = req.body
  res.json(abyss.saveBrokenMirror(sessionId, quote, comment, mode))
})

app.get('/api/mirror/list', async (_req, res) => {
  res.json(db.listBrokenMirrors())
})

app.delete('/api/mirror/:id', async (req, res) => {
  db.deleteBrokenMirror(Number(req.params.id))
  res.json(true)
})

// === Health check ===
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, ts: Date.now() })
})

server.listen(PORT, () => {
  console.log(`Abyss server running on http://localhost:${PORT}`)
})
