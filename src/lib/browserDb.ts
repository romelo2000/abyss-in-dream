// BrowserDB — localStorage-based replacement for DatabaseManager
// Same interface, works in browser without SQLite

import type { Session, Message, Metrics, Insight, UserPattern, BrokenMirror, SessionPhase, GameResult } from '../../electron/types'
import { KOANS, DAILY_CHALLENGES } from '../../electron/shared-types'

const STORAGE_KEY = 'abyss-db-v1'

interface DBData {
  sessions: Session[]
  messages: Message[]
  metrics: Metrics[]
  insights: Insight[]
  broken_mirrors: BrokenMirror[]
  memory_embeddings: { id: number; session_id: number; content: string; embedding: string; topic: string; timestamp: string }[]
  user_patterns: UserPattern[]
  settings: Record<string, string>
  nextId: number
}

function loadData(): DBData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return {
    sessions: [], messages: [], metrics: [], insights: [], broken_mirrors: [],
    memory_embeddings: [], user_patterns: [], settings: {}, nextId: 1,
  }
}

function saveData(data: DBData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

function nextId(data: DBData): number {
  return data.nextId++
}

export class BrowserDB {
  private data: DBData = loadData()

  private save() {
    saveData(this.data)
  }

  async init() {
    // nothing to do
  }

  close() {}

  // === Sessions ===

  createSession(dreamScene: string, model: string): Session {
    const id = nextId(this.data)
    const session: Session = {
      id, title: null, created_at: new Date().toISOString(), ended_at: null,
      dream_scene: dreamScene, model, awakening_level: 0, phase: 'summoning',
      result: null, ego_deaths: 0, koan_used: null, paradox_score: 0, karma: 0,
      silence_count: 0, mirror_used: false, challenge_id: null,
    }
    this.data.sessions.unshift(session)
    this.save()
    return session
  }

  listSessions(): Session[] {
    return [...this.data.sessions].sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime() || b.id - a.id
    )
  }

  getSession(id: number): Session | undefined {
    return this.data.sessions.find(s => s.id === id)
  }

  getSessionMessages(sessionId: number): Message[] {
    return this.data.messages
      .filter(m => m.session_id === sessionId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
  }

  addMessage(sessionId: number, role: string, content: string, mode: string | null): Message {
    const id = nextId(this.data)
    const msg: Message = {
      id, session_id: sessionId, role, content, mode, timestamp: new Date().toISOString(),
    }
    this.data.messages.push(msg)
    this.save()
    return msg
  }

  deleteSession(id: number): boolean {
    const before = this.data.sessions.length
    this.data.sessions = this.data.sessions.filter(s => s.id !== id)
    this.data.messages = this.data.messages.filter(m => m.session_id !== id)
    this.data.metrics = this.data.metrics.filter(m => m.session_id !== id)
    this.data.insights = this.data.insights.filter(i => i.session_id !== id)
    this.data.broken_mirrors = this.data.broken_mirrors.filter(b => b.session_id !== id)
    this.save()
    return this.data.sessions.length < before
  }

  endSession(id: number): boolean {
    const s = this.getSession(id)
    if (!s) return false
    s.ended_at = new Date().toISOString()
    this.save()
    return true
  }

  // === Insights ===

  saveInsight(sessionId: number, content: string): Insight {
    const id = nextId(this.data)
    const insight: Insight = { id, session_id: sessionId, content, timestamp: new Date().toISOString() }
    this.data.insights.push(insight)
    this.save()
    return insight
  }

  listInsights(sessionId?: number): Insight[] {
    let result = this.data.insights
    if (sessionId) result = result.filter(i => i.session_id === sessionId)
    return result.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  }

  deleteInsight(id: number): boolean {
    const before = this.data.insights.length
    this.data.insights = this.data.insights.filter(i => i.id !== id)
    this.save()
    return this.data.insights.length < before
  }

  // === Memory Embeddings ===

  storeMemoryEmbedding(sessionId: number, content: string, embedding: string, topic: string) {
    const id = nextId(this.data)
    this.data.memory_embeddings.push({
      id, session_id: sessionId, content, embedding, topic, timestamp: new Date().toISOString(),
    })
    this.save()
  }

  getMemoryEmbeddings(limit: number = 100) {
    return [...this.data.memory_embeddings]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit)
  }

  // === User Patterns ===

  upsertPattern(patternType: string, patternValue: string) {
    const existing = this.data.user_patterns.find(p => p.pattern_type === patternType && p.pattern_value === patternValue)
    if (existing) {
      existing.frequency++
      existing.last_seen = new Date().toISOString()
    } else {
      const id = nextId(this.data)
      this.data.user_patterns.push({
        id, pattern_type: patternType, pattern_value: patternValue, frequency: 1, last_seen: new Date().toISOString(),
      })
    }
    this.save()
  }

  getUserPatterns(): UserPattern[] {
    return [...this.data.user_patterns]
      .sort((a, b) => b.frequency - a.frequency || new Date(b.last_seen).getTime() - new Date(a.last_seen).getTime())
      .slice(0, 50)
  }

  // === Metrics ===

  getMetrics(sessionId: number): Metrics | undefined {
    return this.data.metrics
      .filter(m => m.session_id === sessionId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0]
  }

  getAllMetrics(): Metrics[] {
    return [...this.data.metrics].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  }

  saveMetrics(metrics: Omit<Metrics, 'id' | 'timestamp'>) {
    const id = nextId(this.data)
    this.data.metrics.push({ ...metrics, id, timestamp: new Date().toISOString() })
    this.save()
  }

  updateAwakeningLevel(sessionId: number, level: number) {
    const s = this.getSession(sessionId)
    if (s) { s.awakening_level = level; this.save() }
  }

  getAwakeningLevel(): number {
    const ended = this.data.sessions.filter(s => s.ended_at)
    if (ended.length === 0) return 0
    return ended.reduce((sum, s) => sum + s.awakening_level, 0) / ended.length
  }

  // === Settings ===

  getSetting(key: string): string | undefined {
    return this.data.settings[key]
  }

  setSetting(key: string, value: string) {
    this.data.settings[key] = value
    this.save()
  }

  getLastSession(): Session | undefined {
    return this.listSessions()[0]
  }

  // === Game mechanics ===

  updateSessionPhase(sessionId: number, phase: SessionPhase) {
    const s = this.getSession(sessionId)
    if (s) { s.phase = phase; this.save() }
  }

  setSessionResult(sessionId: number, result: GameResult) {
    const s = this.getSession(sessionId)
    if (s) { s.result = result; this.save() }
  }

  incrementEgoDeaths(sessionId: number): number {
    const s = this.getSession(sessionId)
    if (s) { s.ego_deaths++; this.save(); return s.ego_deaths }
    return 0
  }

  setSessionKoan(sessionId: number, koan: string) {
    const s = this.getSession(sessionId)
    if (s) { s.koan_used = koan; this.save() }
  }

  getTotalEgoDeaths(): number {
    return this.data.sessions.reduce((sum, s) => sum + (s.ego_deaths || 0), 0)
  }

  getUsedKoans(): string[] {
    return [...new Set(this.data.sessions.filter(s => s.koan_used).map(s => s.koan_used!))]
  }

  // === Achievements ===

  getAchievements(): { id: string; unlocked: boolean; unlocked_at: string | null }[] {
    const raw = this.getSetting('achievements')
    return raw ? JSON.parse(raw) : []
  }

  unlockAchievement(id: string): boolean {
    const achievements = this.getAchievements()
    const existing = achievements.find(a => a.id === id)
    if (existing && existing.unlocked) return false
    if (existing) {
      existing.unlocked = true
      existing.unlocked_at = new Date().toISOString()
    } else {
      achievements.push({ id, unlocked: true, unlocked_at: new Date().toISOString() })
    }
    this.setSetting('achievements', JSON.stringify(achievements))
    return true
  }

  // === Echo ===

  getEchoCandidates(currentSessionId: number, limit: number = 5): Message[] {
    const candidates = this.data.messages
      .filter(m => m.role === 'user' && m.session_id !== currentSessionId)
    // shuffle
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[candidates[i], candidates[j]] = [candidates[j], candidates[i]]
    }
    return candidates.slice(0, limit)
  }

  // === Koan of the Day ===

  getKoanOfDay(): string {
    const today = new Date()
    const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000)
    return KOANS[dayOfYear % KOANS.length]
  }

  // === Dream Letter ===

  getWeeklyStats() {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
    const weekSessions = this.data.sessions.filter(s => new Date(s.created_at).getTime() > weekAgo)
    const weekInsights = this.data.insights.filter(i => new Date(i.timestamp).getTime() > weekAgo)
    const sessionIds = new Set(weekSessions.map(s => s.id))
    const weekMetrics = this.data.metrics.filter(m => sessionIds.has(m.session_id))

    const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0

    return {
      sessions: weekSessions.length,
      avgDepth: avg(weekMetrics.map(m => m.depth)),
      avgHonesty: avg(weekMetrics.map(m => m.honesty)),
      avgFlexibility: avg(weekMetrics.map(m => m.flexibility)),
      avgMindfulness: avg(weekMetrics.map(m => m.mindfulness)),
      avgAwakening: avg(weekMetrics.map(m => m.awakening_level)),
      totalEgoDeaths: weekSessions.reduce((acc, s) => acc + (s.ego_deaths || 0), 0),
      insights: weekInsights.length,
    }
  }

  // === Paradox Score ===

  addParadoxScore(sessionId: number, amount: number): number {
    const s = this.getSession(sessionId)
    if (s) { s.paradox_score += amount; this.save(); return s.paradox_score }
    return 0
  }

  getTotalParadoxScore(): number {
    return this.data.sessions.reduce((sum, s) => sum + (s.paradox_score || 0), 0)
  }

  // === Karma ===

  addKarma(sessionId: number, amount: number): number {
    const s = this.getSession(sessionId)
    if (s) { s.karma += amount; this.save(); return s.karma }
    return 0
  }

  getTotalKarma(): number {
    return this.data.sessions.reduce((sum, s) => sum + (s.karma || 0), 0)
  }

  // === Silence ===

  incrementSilence(sessionId: number): number {
    const s = this.getSession(sessionId)
    if (s) { s.silence_count++; this.save(); return s.silence_count }
    return 0
  }

  // === Broken Mirrors ===

  saveBrokenMirror(sessionId: number, quote: string, comment: string, mode: string): BrokenMirror {
    const id = nextId(this.data)
    const mirror: BrokenMirror = { id, session_id: sessionId, quote, comment, mode, timestamp: new Date().toISOString() }
    this.data.broken_mirrors.push(mirror)
    this.save()
    return mirror
  }

  listBrokenMirrors(): BrokenMirror[] {
    return [...this.data.broken_mirrors].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  }

  deleteBrokenMirror(id: number) {
    this.data.broken_mirrors = this.data.broken_mirrors.filter(b => b.id !== id)
    this.save()
  }

  // === Dream Invasion ===

  getLastSessionDate(): Date | null {
    const s = this.getLastSession()
    return s ? new Date(s.created_at) : null
  }

  shouldShowDreamInvasion(): boolean {
    const last = this.getLastSessionDate()
    if (!last) return false
    const hoursSince = (Date.now() - last.getTime()) / (1000 * 60 * 60)
    const lastInvasion = this.getSetting('last_dream_invasion')
    if (lastInvasion) {
      const sinceInvasion = (Date.now() - new Date(lastInvasion).getTime()) / (1000 * 60 * 60)
      if (sinceInvasion < 48) return false
    }
    return hoursSince > 48
  }

  markDreamInvasionShown() {
    this.setSetting('last_dream_invasion', new Date().toISOString())
  }

  // === Mirror of Truth ===

  setMirrorUsed(sessionId: number) {
    const s = this.getSession(sessionId)
    if (s) { s.mirror_used = true; this.save() }
  }

  // === Daily Challenge ===

  getDailyChallenge() {
    const today = new Date()
    const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000)
    const challenge = DAILY_CHALLENGES[dayOfYear % DAILY_CHALLENGES.length]
    const lastChallengeDate = this.getSetting('last_challenge_date')
    const todayStr = today.toDateString()
    if (lastChallengeDate === todayStr) return null
    this.setSetting('last_challenge_date', todayStr)
    return challenge
  }

  setSessionChallenge(sessionId: number, challengeId: string) {
    const s = this.getSession(sessionId)
    if (s) { s.challenge_id = challengeId; this.save() }
  }

  // === Shadow Echo ===

  getShadowEcho(sessionId: number): string | null {
    const allSessions = this.listSessions()
    if (allSessions.length < 5) return null
    const currentIdx = allSessions.findIndex(s => s.id === sessionId)
    if (currentIdx < 0) return null
    const olderSessions = allSessions.slice(currentIdx + 1)
    if (olderSessions.length === 0) return null

    const olderSessionIds = new Set(olderSessions.map(s => s.id))
    const olderMessages = this.data.messages.filter(
      m => m.role === 'user' && m.content.length > 10 && olderSessionIds.has(m.session_id)
    )

    if (olderMessages.length === 0) return null
    if (Math.random() > 0.15) return null
    const selected = olderMessages[Math.floor(Math.random() * olderMessages.length)]
    return `Тень: "${selected.content.substring(0, 150)}" — ты говорил это раньше. Тень помнит. Тень всегда помнит.`
  }

  // === Session count ===

  getSessionCount(): number {
    return this.data.sessions.length
  }
}
