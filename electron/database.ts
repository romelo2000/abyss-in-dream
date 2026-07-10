import Database from 'better-sqlite3'
import fs from 'fs'
import { Session, Message, Metrics, Insight, UserPattern, SessionPhase, GameResult, KOANS, BrokenMirror, DAILY_CHALLENGES } from './types'

export class DatabaseManager {
  private db: Database.Database
  private dbPath: string

  constructor(dbPath: string) {
    this.dbPath = dbPath
    const dir = dbPath.substring(0, dbPath.lastIndexOf('/'))
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    // If file exists but is not SQLite format (e.g. old JSON), rename it
    if (fs.existsSync(dbPath)) {
      const header = Buffer.alloc(16)
      const fd = fs.openSync(dbPath, 'r')
      fs.readSync(fd, header, 0, 16, 0)
      fs.closeSync(fd)
      const isSqlite = header.slice(0, 15).toString() === 'SQLite format 3'
      if (!isSqlite) {
        const backupPath = dbPath + '.old-json'
        fs.renameSync(dbPath, backupPath)
        console.log('Renamed non-SQLite file to', backupPath)
      }
    }
    this.db = new Database(dbPath)
    this.db.pragma('journal_mode = WAL')
    this.db.pragma('foreign_keys = ON')
  }

  async init() {
    this.createTables()
    this.migrateOldJson()
  }

  private createTables() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        created_at TEXT NOT NULL,
        ended_at TEXT,
        dream_scene TEXT NOT NULL,
        model TEXT NOT NULL,
        awakening_level INTEGER DEFAULT 0,
        phase TEXT DEFAULT 'summoning',
        result TEXT,
        ego_deaths INTEGER DEFAULT 0,
        koan_used TEXT,
        paradox_score INTEGER DEFAULT 0,
        karma INTEGER DEFAULT 0,
        silence_count INTEGER DEFAULT 0,
        mirror_used INTEGER DEFAULT 0,
        challenge_id TEXT
      );

      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        mode TEXT,
        timestamp TEXT NOT NULL,
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS metrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER NOT NULL,
        depth INTEGER DEFAULT 0,
        honesty INTEGER DEFAULT 0,
        flexibility INTEGER DEFAULT 0,
        mindfulness INTEGER DEFAULT 0,
        awakening_level INTEGER DEFAULT 0,
        timestamp TEXT NOT NULL,
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS insights (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER,
        content TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS broken_mirrors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER NOT NULL,
        quote TEXT NOT NULL,
        comment TEXT NOT NULL,
        mode TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS memory_embeddings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        embedding TEXT NOT NULL,
        topic TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS user_patterns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pattern_type TEXT NOT NULL,
        pattern_value TEXT NOT NULL,
        frequency INTEGER DEFAULT 1,
        last_seen TEXT NOT NULL,
        UNIQUE(pattern_type, pattern_value)
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id);
      CREATE INDEX IF NOT EXISTS idx_metrics_session ON metrics(session_id);
      CREATE INDEX IF NOT EXISTS idx_memory_session ON memory_embeddings(session_id);
      CREATE INDEX IF NOT EXISTS idx_insights_session ON insights(session_id);
    `)
  }

  private migrateOldJson() {
    const jsonPath = this.dbPath.replace(/\.db$/, '.json')
    if (!fs.existsSync(jsonPath)) return

    try {
      const raw = fs.readFileSync(jsonPath, 'utf-8')
      const old = JSON.parse(raw)
      if (!old.sessions || old.sessions.length === 0) return

      console.log('Migrating from JSON to SQLite...')

      for (const s of old.sessions) {
        this.db.prepare(`INSERT OR IGNORE INTO sessions
          (id, title, created_at, ended_at, dream_scene, model, awakening_level, phase, result, ego_deaths, koan_used, paradox_score, karma, silence_count, mirror_used, challenge_id)
          VALUES (@id, @title, @created_at, @ended_at, @dream_scene, @model, @awakening_level, @phase, @result, @ego_deaths, @koan_used, @paradox_score, @karma, @silence_count, @mirror_used, @challenge_id)`
        ).run({
          id: s.id,
          title: s.title || null,
          created_at: s.created_at,
          ended_at: s.ended_at || null,
          dream_scene: s.dream_scene,
          model: s.model,
          awakening_level: s.awakening_level || 0,
          phase: s.phase || 'completed',
          result: s.result || null,
          ego_deaths: s.ego_deaths || 0,
          koan_used: s.koan_used || null,
          paradox_score: s.paradox_score || 0,
          karma: s.karma || 0,
          silence_count: s.silence_count || 0,
          mirror_used: s.mirror_used ? 1 : 0,
          challenge_id: s.challenge_id || null,
        })
      }

      for (const m of (old.messages || [])) {
        this.db.prepare(`INSERT INTO messages (id, session_id, role, content, mode, timestamp)
          VALUES (@id, @session_id, @role, @content, @mode, @timestamp)`
        ).run(m)
      }

      for (const m of (old.metrics || [])) {
        this.db.prepare(`INSERT INTO metrics (id, session_id, depth, honesty, flexibility, mindfulness, awakening_level, timestamp)
          VALUES (@id, @session_id, @depth, @honesty, @flexibility, @mindfulness, @awakening_level, @timestamp)`
        ).run(m)
      }

      for (const i of (old.insights || [])) {
        this.db.prepare(`INSERT INTO insights (id, session_id, content, timestamp)
          VALUES (@id, @session_id, @content, @timestamp)`
        ).run(i)
      }

      for (const b of (old.broken_mirrors || [])) {
        this.db.prepare(`INSERT INTO broken_mirrors (id, session_id, quote, comment, mode, timestamp)
          VALUES (@id, @session_id, @quote, @comment, @mode, @timestamp)`
        ).run(b)
      }

      for (const e of (old.memory_embeddings || [])) {
        this.db.prepare(`INSERT INTO memory_embeddings (id, session_id, content, embedding, topic, timestamp)
          VALUES (@id, @session_id, @content, @embedding, @topic, @timestamp)`
        ).run(e)
      }

      for (const p of (old.user_patterns || [])) {
        this.db.prepare(`INSERT OR IGNORE INTO user_patterns (id, pattern_type, pattern_value, frequency, last_seen)
          VALUES (@id, @pattern_type, @pattern_value, @frequency, @last_seen)`
        ).run(p)
      }

      if (old.settings) {
        for (const [key, value] of Object.entries(old.settings)) {
          this.db.prepare(`INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`).run(key, String(value))
        }
      }

      fs.renameSync(jsonPath, jsonPath + '.migrated')
      console.log('Migration complete. Old JSON backed up as .migrated')
    } catch (e) {
      console.error('Migration error:', e)
    }
  }

  close() {
    try {
      this.db.close()
    } catch {}
  }

  // === Sessions ===

  createSession(dreamScene: string, model: string): Session {
    const stmt = this.db.prepare(`INSERT INTO sessions (title, created_at, dream_scene, model, awakening_level, phase, result, ego_deaths, koan_used, paradox_score, karma, silence_count, mirror_used, challenge_id)
      VALUES (NULL, @created_at, @dream_scene, @model, 0, 'summoning', NULL, 0, NULL, 0, 0, 0, 0, NULL)`)
    const info = stmt.run({
      created_at: new Date().toISOString(),
      dream_scene: dreamScene,
      model,
    })
    return this.getSession(info.lastInsertRowid as number)!
  }

  listSessions(): Session[] {
    return this.db.prepare(`SELECT * FROM sessions ORDER BY datetime(created_at) DESC, id DESC`).all() as Session[]
  }

  getSession(id: number): Session | undefined {
    const row = this.db.prepare(`SELECT * FROM sessions WHERE id = ?`).get(id) as any
    if (!row) return undefined
    return { ...row, mirror_used: !!row.mirror_used } as Session
  }

  getSessionMessages(sessionId: number): Message[] {
    return this.db.prepare(`SELECT * FROM messages WHERE session_id = ? ORDER BY datetime(timestamp) ASC`).all(sessionId) as Message[]
  }

  addMessage(sessionId: number, role: string, content: string, mode: string | null): Message {
    const ts = new Date().toISOString()
    const info = this.db.prepare(`INSERT INTO messages (session_id, role, content, mode, timestamp) VALUES (?, ?, ?, ?, ?)`)
      .run(sessionId, role, content, mode, ts)
    return {
      id: info.lastInsertRowid as number,
      session_id: sessionId,
      role,
      content,
      mode,
      timestamp: ts,
    }
  }

  deleteSession(id: number): boolean {
    const info = this.db.prepare(`DELETE FROM sessions WHERE id = ?`).run(id)
    return info.changes > 0
  }

  endSession(id: number): boolean {
    const info = this.db.prepare(`UPDATE sessions SET ended_at = ? WHERE id = ?`).run(new Date().toISOString(), id)
    return info.changes > 0
  }

  // === Insights ===

  saveInsight(sessionId: number, content: string): Insight {
    const ts = new Date().toISOString()
    const info = this.db.prepare(`INSERT INTO insights (session_id, content, timestamp) VALUES (?, ?, ?)`)
      .run(sessionId, content, ts)
    return {
      id: info.lastInsertRowid as number,
      session_id: sessionId,
      content,
      timestamp: ts,
    }
  }

  listInsights(sessionId?: number): Insight[] {
    if (sessionId) {
      return this.db.prepare(`SELECT * FROM insights WHERE session_id = ? ORDER BY datetime(timestamp) DESC`).all(sessionId) as Insight[]
    }
    return this.db.prepare(`SELECT * FROM insights ORDER BY datetime(timestamp) DESC`).all() as Insight[]
  }

  deleteInsight(id: number): boolean {
    const info = this.db.prepare(`DELETE FROM insights WHERE id = ?`).run(id)
    return info.changes > 0
  }

  // === Memory Embeddings ===

  storeMemoryEmbedding(sessionId: number, content: string, embedding: string, topic: string) {
    this.db.prepare(`INSERT INTO memory_embeddings (session_id, content, embedding, topic, timestamp) VALUES (?, ?, ?, ?, ?)`)
      .run(sessionId, content, embedding, topic, new Date().toISOString())
  }

  getMemoryEmbeddings(limit: number = 100): { id: number; content: string; embedding: string; topic: string; session_id: number }[] {
    return this.db.prepare(`SELECT id, session_id, content, embedding, topic, timestamp FROM memory_embeddings ORDER BY datetime(timestamp) DESC LIMIT ?`).all(limit) as any[]
  }

  // === User Patterns ===

  upsertPattern(patternType: string, patternValue: string) {
    const existing = this.db.prepare(`SELECT id, frequency FROM user_patterns WHERE pattern_type = ? AND pattern_value = ?`).get(patternType, patternValue) as any
    if (existing) {
      this.db.prepare(`UPDATE user_patterns SET frequency = frequency + 1, last_seen = ? WHERE id = ?`)
        .run(new Date().toISOString(), existing.id)
    } else {
      this.db.prepare(`INSERT INTO user_patterns (pattern_type, pattern_value, frequency, last_seen) VALUES (?, ?, 1, ?)`)
        .run(patternType, patternValue, new Date().toISOString())
    }
  }

  getUserPatterns(): UserPattern[] {
    return this.db.prepare(`SELECT * FROM user_patterns ORDER BY frequency DESC, datetime(last_seen) DESC LIMIT 50`).all() as UserPattern[]
  }

  // === Metrics ===

  getMetrics(sessionId: number): Metrics | undefined {
    return this.db.prepare(`SELECT * FROM metrics WHERE session_id = ? ORDER BY datetime(timestamp) DESC LIMIT 1`).get(sessionId) as Metrics | undefined
  }

  getAllMetrics(): Metrics[] {
    return this.db.prepare(`SELECT * FROM metrics ORDER BY datetime(timestamp) DESC`).all() as Metrics[]
  }

  saveMetrics(metrics: Omit<Metrics, 'id' | 'timestamp'>) {
    this.db.prepare(`INSERT INTO metrics (session_id, depth, honesty, flexibility, mindfulness, awakening_level, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)`)
      .run(metrics.session_id, metrics.depth, metrics.honesty, metrics.flexibility, metrics.mindfulness, metrics.awakening_level, new Date().toISOString())
  }

  updateAwakeningLevel(sessionId: number, level: number) {
    this.db.prepare(`UPDATE sessions SET awakening_level = ? WHERE id = ?`).run(level, sessionId)
  }

  getAwakeningLevel(): number {
    const result = this.db.prepare(`SELECT AVG(awakening_level) as avg FROM sessions WHERE ended_at IS NOT NULL`).get() as any
    return result?.avg || 0
  }

  // === Settings ===

  getSetting(key: string): string | undefined {
    const row = this.db.prepare(`SELECT value FROM settings WHERE key = ?`).get(key) as any
    return row?.value
  }

  setSetting(key: string, value: string) {
    this.db.prepare(`INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`).run(key, value)
  }

  getLastSession(): Session | undefined {
    return this.db.prepare(`SELECT * FROM sessions ORDER BY datetime(created_at) DESC LIMIT 1`).get() as Session | undefined
  }

  // === Game mechanics ===

  updateSessionPhase(sessionId: number, phase: SessionPhase) {
    this.db.prepare(`UPDATE sessions SET phase = ? WHERE id = ?`).run(phase, sessionId)
  }

  setSessionResult(sessionId: number, result: GameResult) {
    this.db.prepare(`UPDATE sessions SET result = ? WHERE id = ?`).run(result, sessionId)
  }

  incrementEgoDeaths(sessionId: number): number {
    this.db.prepare(`UPDATE sessions SET ego_deaths = ego_deaths + 1 WHERE id = ?`).run(sessionId)
    const session = this.getSession(sessionId)
    return session?.ego_deaths || 0
  }

  setSessionKoan(sessionId: number, koan: string) {
    this.db.prepare(`UPDATE sessions SET koan_used = ? WHERE id = ?`).run(koan, sessionId)
  }

  getTotalEgoDeaths(): number {
    const result = this.db.prepare(`SELECT COALESCE(SUM(ego_deaths), 0) as total FROM sessions`).get() as any
    return result?.total || 0
  }

  getUsedKoans(): string[] {
    const rows = this.db.prepare(`SELECT DISTINCT koan_used FROM sessions WHERE koan_used IS NOT NULL`).all() as any[]
    return rows.map(r => r.koan_used)
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
    return this.db.prepare(`SELECT * FROM messages WHERE role = 'user' AND session_id != ? ORDER BY RANDOM() LIMIT ?`)
      .all(currentSessionId, limit) as Message[]
  }

  // === Koan of the Day ===

  getKoanOfDay(): string {
    const today = new Date()
    const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000)
    return KOANS[dayOfYear % KOANS.length]
  }

  // === Dream Letter (weekly review) ===

  getWeeklyStats(): { sessions: number; avgDepth: number; avgHonesty: number; avgFlexibility: number; avgMindfulness: number; avgAwakening: number; totalEgoDeaths: number; insights: number } {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const weekSessions = this.db.prepare(`SELECT * FROM sessions WHERE datetime(created_at) > datetime(?)`).all(weekAgo) as Session[]
    const weekInsights = this.db.prepare(`SELECT COUNT(*) as count FROM insights WHERE datetime(timestamp) > datetime(?)`).get(weekAgo) as any

    if (weekSessions.length === 0) {
      return { sessions: 0, avgDepth: 0, avgHonesty: 0, avgFlexibility: 0, avgMindfulness: 0, avgAwakening: 0, totalEgoDeaths: 0, insights: 0 }
    }

    const sessionIds = weekSessions.map(s => s.id)
    const placeholders = sessionIds.map(() => '?').join(',')
    const weekMetrics = this.db.prepare(`SELECT * FROM metrics WHERE session_id IN (${placeholders})`).all(...sessionIds) as Metrics[]

    const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0

    return {
      sessions: weekSessions.length,
      avgDepth: avg(weekMetrics.map(m => m.depth)),
      avgHonesty: avg(weekMetrics.map(m => m.honesty)),
      avgFlexibility: avg(weekMetrics.map(m => m.flexibility)),
      avgMindfulness: avg(weekMetrics.map(m => m.mindfulness)),
      avgAwakening: avg(weekMetrics.map(m => m.awakening_level)),
      totalEgoDeaths: weekSessions.reduce((acc, s) => acc + (s.ego_deaths || 0), 0),
      insights: weekInsights?.count || 0,
    }
  }

  // === Paradox Score ===

  addParadoxScore(sessionId: number, amount: number): number {
    this.db.prepare(`UPDATE sessions SET paradox_score = paradox_score + ? WHERE id = ?`).run(amount, sessionId)
    const session = this.getSession(sessionId)
    return session?.paradox_score || 0
  }

  getTotalParadoxScore(): number {
    const result = this.db.prepare(`SELECT COALESCE(SUM(paradox_score), 0) as total FROM sessions`).get() as any
    return result?.total || 0
  }

  // === Karma ===

  addKarma(sessionId: number, amount: number): number {
    this.db.prepare(`UPDATE sessions SET karma = karma + ? WHERE id = ?`).run(amount, sessionId)
    const session = this.getSession(sessionId)
    return session?.karma || 0
  }

  getTotalKarma(): number {
    const result = this.db.prepare(`SELECT COALESCE(SUM(karma), 0) as total FROM sessions`).get() as any
    return result?.total || 0
  }

  // === Silence ===

  incrementSilence(sessionId: number): number {
    this.db.prepare(`UPDATE sessions SET silence_count = silence_count + 1 WHERE id = ?`).run(sessionId)
    const session = this.getSession(sessionId)
    return session?.silence_count || 0
  }

  // === Broken Mirrors ===

  saveBrokenMirror(sessionId: number, quote: string, comment: string, mode: string): BrokenMirror {
    const ts = new Date().toISOString()
    const info = this.db.prepare(`INSERT INTO broken_mirrors (session_id, quote, comment, mode, timestamp) VALUES (?, ?, ?, ?, ?)`)
      .run(sessionId, quote, comment, mode, ts)
    return {
      id: info.lastInsertRowid as number,
      session_id: sessionId,
      quote,
      comment,
      mode,
      timestamp: ts,
    }
  }

  listBrokenMirrors(): BrokenMirror[] {
    return this.db.prepare(`SELECT * FROM broken_mirrors ORDER BY datetime(timestamp) DESC`).all() as BrokenMirror[]
  }

  deleteBrokenMirror(id: number) {
    this.db.prepare(`DELETE FROM broken_mirrors WHERE id = ?`).run(id)
  }

  // === Dream Invasion ===

  getLastSessionDate(): Date | null {
    const session = this.getLastSession()
    if (!session) return null
    return new Date(session.created_at)
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
    this.db.prepare(`UPDATE sessions SET mirror_used = 1 WHERE id = ?`).run(sessionId)
  }

  // === Daily Challenge ===

  getDailyChallenge(): { id: string; name: string; description: string; hint: string } | null {
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
    this.db.prepare(`UPDATE sessions SET challenge_id = ? WHERE id = ?`).run(challengeId, sessionId)
  }

  // === Shadow Echo ===

  getShadowEcho(sessionId: number): string | null {
    const allSessions = this.listSessions()
    if (allSessions.length < 5) return null
    const currentIdx = allSessions.findIndex(s => s.id === sessionId)
    if (currentIdx < 0) return null
    const olderSessions = allSessions.slice(currentIdx + 1)
    if (olderSessions.length === 0) return null

    const olderSessionIds = olderSessions.map(s => s.id)
    const placeholders = olderSessionIds.map(() => '?').join(',')
    const olderMessages = this.db.prepare(`SELECT * FROM messages WHERE role = 'user' AND length(content) > 10 AND session_id IN (${placeholders})`)
      .all(...olderSessionIds) as Message[]

    if (olderMessages.length === 0) return null
    if (Math.random() > 0.15) return null
    const selected = olderMessages[Math.floor(Math.random() * olderMessages.length)]
    return `Тень: "${selected.content.substring(0, 150)}" — ты говорил это раньше. Тень помнит. Тень всегда помнит.`
  }

  // === Session count ===

  getSessionCount(): number {
    const result = this.db.prepare(`SELECT COUNT(*) as count FROM sessions`).get() as any
    return result?.count || 0
  }
}
