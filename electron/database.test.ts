import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { DatabaseManager } from './database'
import path from 'path'
import fs from 'fs'
import os from 'os'

describe('DatabaseManager', () => {
  let db: DatabaseManager
  let dbPath: string

  beforeEach(async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'abyss-test-'))
    dbPath = path.join(tmpDir, 'test.db')
    db = new DatabaseManager(dbPath)
    await db.init()
  })

  afterEach(() => {
    db.close()
    try { fs.unlinkSync(dbPath) } catch {}
    try { fs.unlinkSync(dbPath + '-wal') } catch {}
    try { fs.unlinkSync(dbPath + '-shm') } catch {}
    try { fs.rmSync(path.dirname(dbPath), { recursive: true }) } catch {}
  })

  it('should create and retrieve a session', () => {
    const session = db.createSession('void', 'qwen2.5:7b')
    expect(session.id).toBeGreaterThan(0)
    expect(session.dream_scene).toBe('void')
    expect(session.model).toBe('qwen2.5:7b')
    expect(session.phase).toBe('summoning')

    const retrieved = db.getSession(session.id)
    expect(retrieved).toBeDefined()
    expect(retrieved!.id).toBe(session.id)
  })

  it('should list sessions ordered by created_at desc', async () => {
    const s1 = db.createSession('void', 'm1')
    await new Promise(r => setTimeout(r, 50))
    const s2 = db.createSession('forest', 'm2')
    const sessions = db.listSessions()
    expect(sessions).toHaveLength(2)
    // s2 created later, should be first
    expect(sessions[0].id).toBe(s2.id)
    expect(sessions[1].id).toBe(s1.id)
  })

  it('should add and retrieve messages', () => {
    const session = db.createSession('void', 'm1')
    const msg1 = db.addMessage(session.id, 'user', 'Hello', null)
    const msg2 = db.addMessage(session.id, 'abyss', 'Welcome', 'mirror_koan')

    const messages = db.getSessionMessages(session.id)
    expect(messages).toHaveLength(2)
    expect(messages[0].id).toBe(msg1.id)
    expect(messages[1].id).toBe(msg2.id)
    expect(messages[1].mode).toBe('mirror_koan')
  })

  it('should delete session and cascade delete messages', () => {
    const session = db.createSession('void', 'm1')
    db.addMessage(session.id, 'user', 'Hello', null)
    db.addMessage(session.id, 'abyss', 'Hi', 'dream')

    const deleted = db.deleteSession(session.id)
    expect(deleted).toBe(true)
    expect(db.getSession(session.id)).toBeUndefined()
    expect(db.getSessionMessages(session.id)).toHaveLength(0)
  })

  it('should save and retrieve metrics', () => {
    const session = db.createSession('void', 'm1')
    db.saveMetrics({
      session_id: session.id,
      depth: 50,
      honesty: 60,
      flexibility: 40,
      mindfulness: 70,
      awakening_level: 30,
    })

    const metrics = db.getMetrics(session.id)
    expect(metrics).toBeDefined()
    expect(metrics!.depth).toBe(50)
    expect(metrics!.honesty).toBe(60)
  })

  it('should store and retrieve memory embeddings', () => {
    const session = db.createSession('void', 'm1')
    db.storeMemoryEmbedding(session.id, 'test content', '[0.1, 0.2, 0.3]', 'topic1')

    const embeddings = db.getMemoryEmbeddings(10)
    expect(embeddings).toHaveLength(1)
    expect(embeddings[0].content).toBe('test content')
    expect(embeddings[0].embedding).toBe('[0.1, 0.2, 0.3]')
  })

  it('should upsert patterns', () => {
    db.upsertPattern('emotion', 'fear')
    db.upsertPattern('emotion', 'fear')
    db.upsertPattern('emotion', 'fear')

    const patterns = db.getUserPatterns()
    expect(patterns).toHaveLength(1)
    expect(patterns[0].frequency).toBe(3)
  })

  it('should handle settings', () => {
    db.setSetting('key1', 'value1')
    expect(db.getSetting('key1')).toBe('value1')
    expect(db.getSetting('nonexistent')).toBeUndefined()
  })

  it('should track ego deaths', () => {
    const session = db.createSession('void', 'm1')
    expect(db.getTotalEgoDeaths()).toBe(0)
    db.incrementEgoDeaths(session.id)
    db.incrementEgoDeaths(session.id)
    expect(db.getTotalEgoDeaths()).toBe(2)
  })

  it('should track karma and paradox score', () => {
    const session = db.createSession('void', 'm1')
    db.addKarma(session.id, 10)
    db.addKarma(session.id, 5)
    db.addParadoxScore(session.id, 3)
    expect(db.getTotalKarma()).toBe(15)
    expect(db.getTotalParadoxScore()).toBe(3)
  })

  it('should handle insights', () => {
    const session = db.createSession('void', 'm1')
    db.saveInsight(session.id, 'Test insight')
    const insights = db.listInsights()
    expect(insights).toHaveLength(1)
    expect(insights[0].content).toBe('Test insight')
  })

  it('should handle broken mirrors', () => {
    const session = db.createSession('void', 'm1')
    db.saveBrokenMirror(session.id, 'quote', 'comment', 'mirror_koan')
    const mirrors = db.listBrokenMirrors()
    expect(mirrors).toHaveLength(1)
    expect(mirrors[0].quote).toBe('quote')
  })

  it('should update session phase', () => {
    const session = db.createSession('void', 'm1')
    db.updateSessionPhase(session.id, 'crisis')
    const updated = db.getSession(session.id)
    expect(updated!.phase).toBe('crisis')
  })

  it('should calculate awakening level average', () => {
    const s1 = db.createSession('void', 'm1')
    db.updateAwakeningLevel(s1.id, 40)
    db.endSession(s1.id)
    const s2 = db.createSession('void', 'm2')
    db.updateAwakeningLevel(s2.id, 60)
    db.endSession(s2.id)
    expect(db.getAwakeningLevel()).toBe(50)
  })

  it('should get session count', () => {
    expect(db.getSessionCount()).toBe(0)
    db.createSession('void', 'm1')
    db.createSession('void', 'm2')
    expect(db.getSessionCount()).toBe(2)
  })
})
