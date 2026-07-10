import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AbyssEngine } from './abyss'
import type { DatabaseManager } from './database'
import type { OllamaClient } from './ollama'
import type { MemorySystem } from './memory'

function createMockDeps() {
  const db = {
    getMetrics: vi.fn().mockReturnValue({ depth: 0, honesty: 0, flexibility: 0, mindfulness: 0, awakening_level: 0 }),
    saveMetrics: vi.fn(),
    updateAwakeningLevel: vi.fn(),
    updateSessionPhase: vi.fn(),
    setSessionResult: vi.fn(),
    incrementEgoDeaths: vi.fn().mockReturnValue(1),
    unlockAchievement: vi.fn().mockReturnValue(true),
    addParadoxScore: vi.fn().mockReturnValue(0),
    addKarma: vi.fn().mockReturnValue(0),
    incrementSilence: vi.fn().mockReturnValue(1),
    setMirrorUsed: vi.fn(),
    setSessionKoan: vi.fn(),
    getUsedKoans: vi.fn().mockReturnValue([]),
    getAchievements: vi.fn().mockReturnValue([]),
    getEchoCandidates: vi.fn().mockReturnValue([]),
    getSessionMessages: vi.fn().mockReturnValue([]),
    getSession: vi.fn().mockReturnValue({ id: 1, phase: 'summoning', ego_deaths: 0, paradox_score: 0, karma: 0, silence_count: 0, mirror_used: false, challenge_id: null, koan_used: null, awakening_level: 0 }),
    getSessionCount: vi.fn().mockReturnValue(1),
    listSessions: vi.fn().mockReturnValue([]),
    getShadowEcho: vi.fn().mockReturnValue(null),
    saveBrokenMirror: vi.fn(),
    getLastSessionDate: vi.fn().mockReturnValue(null),
    shouldShowDreamInvasion: vi.fn().mockReturnValue(false),
    markDreamInvasionShown: vi.fn(),
  } as unknown as DatabaseManager

  const ollama = {} as unknown as OllamaClient
  const memory = {} as unknown as MemorySystem

  return { db, ollama, memory }
}

describe('AbyssEngine', () => {
  let engine: AbyssEngine
  let deps: ReturnType<typeof createMockDeps>

  beforeEach(() => {
    deps = createMockDeps()
    engine = new AbyssEngine(deps.ollama, deps.db, deps.memory)
  })

  describe('getDemoResponse', () => {
    it('should return a string for each mode', () => {
      const modes = ['mirror_koan', 'troll_enlightened', 'dream', 'ego_court', 'merge', 'chaos']
      for (const mode of modes) {
        const response = engine.getDemoResponse('test message', mode)
        expect(typeof response).toBe('string')
        expect(response.length).toBeGreaterThan(10)
      }
    })

    it('should fallback to mirror_koan for unknown mode', () => {
      const response = engine.getDemoResponse('test', 'unknown_mode')
      expect(typeof response).toBe('string')
      expect(response.length).toBeGreaterThan(10)
    })

    it('should include part of user message in mirror_koan response', () => {
      const response = engine.getDemoResponse('my test message', 'mirror_koan')
      // One of the mirror_koan responses includes the user message
      const allResponses = [
        'Ты говоришь: «my test message...». Но кто говорит? И кому? Зеркало не отвечает. Оно отражает. А ты — что отражаешь?',
        'Твои слова — эхо. Но эхо чего? Найди источник. Или признай, что его нет.',
      ]
      expect(allResponses).toContain(response)
    })
  })

  describe('selectMode', () => {
    it('should return a valid mode', () => {
      const mode = engine.selectMode('I feel afraid', [], [])
      expect(['mirror_koan', 'troll_enlightened', 'dream', 'ego_court', 'merge', 'chaos']).toContain(mode)
    })

    it('should not repeat the same mode too many times', () => {
      const modes: string[] = []
      for (let i = 0; i < 10; i++) {
        const m = engine.selectMode('test', [], [])
        modes.push(m)
      }
      // At least 2 different modes in 10 calls
      const unique = new Set(modes)
      expect(unique.size).toBeGreaterThanOrEqual(2)
    })
  })

  describe('shouldSilence', () => {
    it('should return a boolean', () => {
      expect(typeof engine.shouldSilence()).toBe('boolean')
    })
  })

  describe('getSilenceMessage', () => {
    it('should return a non-empty string', () => {
      const msg = engine.getSilenceMessage()
      expect(typeof msg).toBe('string')
      expect(msg.length).toBeGreaterThan(0)
    })
  })

  describe('getDreamVoice', () => {
    it('should return a string (possibly empty due to 20% chance)', () => {
      const voice = engine.getDreamVoice()
      expect(typeof voice).toBe('string')
    })

    it('should return non-empty string when called multiple times', () => {
      let found = false
      for (let i = 0; i < 20; i++) {
        const voice = engine.getDreamVoice()
        if (voice.length > 0) { found = true; break }
      }
      expect(found).toBe(true)
    })
  })

  describe('getKarmaMessage', () => {
    it('should return null or a string', () => {
      const msg = engine.getKarmaMessage(1)
      expect(msg === null || typeof msg === 'string').toBe(true)
    })
  })
})
