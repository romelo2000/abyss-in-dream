// BrowserMemory — simplified MemorySystem without embeddings
import type { UserPattern } from '../../electron/types'

export class BrowserMemory {
  constructor(private db: any) {}

  async init() {}

  async processInteraction(userMessage: string, _abyssResponse: string, _sessionId: number, _mode: string) {
    this.extractPatterns(userMessage)
  }

  async getRelevantMemory(_currentMessage: string, _currentSessionId: number): Promise<string> {
    return ''
  }

  async searchMemory(_query: string): Promise<any[]> {
    return []
  }

  getUserPatterns(): UserPattern[] {
    return this.db.getUserPatterns()
  }

  getWelcomeMessage(): string {
    const patterns = this.db.getUserPatterns()
    if (patterns.length === 0) return ''
    const topPattern = patterns[0]
    return `[Память: ты часто обращаешься к теме "${topPattern.pattern_value}". Бездна это помнит.]`
  }

  private extractPatterns(message: string) {
    const words = message.toLowerCase()
      .replace(/[^\p{L}\s]/gu, ' ')
      .split(/\s+/)
      .filter(w => w.length >= 5 && w.length <= 20)

    const unique = [...new Set(words)]
    for (const word of unique.slice(0, 3)) {
      this.db.upsertPattern('keyword', word)
    }

    // Detect question patterns
    if (message.includes('?')) {
      this.db.upsertPattern('behavior', 'asks_questions')
    }
    if (message.length > 200) {
      this.db.upsertPattern('behavior', 'long_messages')
    }
    if (message.length < 20) {
      this.db.upsertPattern('behavior', 'short_messages')
    }
  }
}
