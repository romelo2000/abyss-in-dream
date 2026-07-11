import { DatabaseManager } from './database'
import { OllamaClient } from './ollama'
import { UserPattern, Message } from './types'

interface MemorySearchResult {
  content: string
  topic: string
  similarity: number
  session_id: number
}

export class MemorySystem {
  private normCache: Map<number, { norm: number; vector: number[] }> = new Map()

  constructor(
    private db: DatabaseManager,
    private ollama: OllamaClient
  ) {}

  async init() {
    // Preload existing embeddings into memory if needed
  }

  async processInteraction(
    userMessage: string,
    abyssResponse: string,
    sessionId: number,
    mode: string
  ) {
    // Generate embedding for user message
    try {
      const embedding = await this.ollama.generateEmbedding(userMessage)
      if (embedding.length > 0) {
        const topic = this.extractTopic(userMessage)
        this.db.storeMemoryEmbedding(
          sessionId,
          `Пользователь: ${userMessage}`,
          JSON.stringify(embedding),
          topic
        )
      }

      // Also store abyss response
      const respEmbedding = await this.ollama.generateEmbedding(abyssResponse)
      if (respEmbedding.length > 0) {
        this.db.storeMemoryEmbedding(
          sessionId,
          `Бездна: ${abyssResponse}`,
          JSON.stringify(respEmbedding),
          mode
        )
      }
    } catch (err) {
      console.error('Memory processing error:', err)
    }

    // Extract and store patterns
    this.extractPatterns(userMessage)
  }

  async getRelevantMemory(
    currentMessage: string,
    currentSessionId: number
  ): Promise<string> {
    try {
      const embedding = await this.ollama.generateEmbedding(currentMessage)
      if (embedding.length === 0) return ''

      const allMemories = this.db.getMemoryEmbeddings(200)
      if (allMemories.length === 0) return ''

      // Filter out current session
      const pastMemories = allMemories.filter(m => m.session_id !== currentSessionId)
      if (pastMemories.length === 0) return ''

      // Calculate similarities
      const scored = pastMemories.map(m => {
        const storedEmbedding = JSON.parse(m.embedding) as number[]
        const similarity = this.cosineSimilarity(embedding, storedEmbedding, undefined, m.id)
        return { ...m, similarity }
      })

      scored.sort((a, b) => b.similarity - a.similarity)
      const top = scored.filter(m => m.similarity > 0.5).slice(0, 5)

      if (top.length === 0) return ''

      const memoryText = top
        .map(m => `[${m.topic}] ${m.content}`)
        .join('\n')

      return `\n\n=== ПАМЯТЬ ИЗ ПРОШЛЫХ СЕССИЙ ===\n${memoryText}\n=== КОНЕЦ ПАМЯТИ ===\n`
    } catch (err) {
      console.error('Memory retrieval error:', err)
      return ''
    }
  }

  async searchMemory(query: string): Promise<MemorySearchResult[]> {
    try {
      const embedding = await this.ollama.generateEmbedding(query)
      if (embedding.length === 0) return []

      const allMemories = this.db.getMemoryEmbeddings(200)
      const scored = allMemories.map(m => {
        const storedEmbedding = JSON.parse(m.embedding) as number[]
        const similarity = this.cosineSimilarity(embedding, storedEmbedding, undefined, m.id)
        return {
          content: m.content,
          topic: m.topic,
          similarity,
          session_id: m.session_id,
        }
      })

      scored.sort((a, b) => b.similarity - a.similarity)
      return scored.filter(m => m.similarity > 0.3).slice(0, 10)
    } catch {
      return []
    }
  }

  getUserPatterns(): UserPattern[] {
    return this.db.getUserPatterns()
  }

  getWelcomeMessage(): string {
    const patterns = this.db.getUserPatterns()
    const lastSession = this.db.getLastSession()

    if (!lastSession || !lastSession.ended_at) {
      return ''
    }

    const topTopics = patterns
      .filter(p => p.pattern_type === 'topic')
      .slice(0, 3)
      .map(p => p.pattern_value)

    const topWeaknesses = patterns
      .filter(p => p.pattern_type === 'weakness')
      .slice(0, 2)
      .map(p => p.pattern_value)

    let welcome = ''
    if (topTopics.length > 0) {
      welcome += `В прошлых снах ты часто говорил о: ${topTopics.join(', ')}. `
    }
    if (topWeaknesses.length > 0) {
      welcome += `Твои любимые иллюзии: ${topWeaknesses.join(', ')}. `
    }

    return welcome
  }

  private extractTopic(message: string): string {
    const lower = message.toLowerCase()
    const topics: Record<string, string[]> = {
      'страх': ['страх', 'боюсь', 'боязнь', 'тревож', 'паник'],
      'эго': ['эго', 'гордость', 'я лучше', 'я хуже', 'самооценк'],
      'смысл': ['смысл', 'зачем', 'для чего', 'цель', 'предназначен'],
      'отношения': ['отношения', 'любовь', 'близость', 'одиночество', 'привязанност'],
      'работа': ['работа', 'карьера', 'деньги', 'успех', 'достижени'],
      'буддизм': ['будд', 'медитац', 'осознанн', 'просветлен', 'дхарм', 'коан'],
      'сон': ['сон', 'сновиден', 'вижу', 'приснилось'],
      'смерть': ['смерть', 'умеру', 'конец', 'пустот'],
      'свобода': ['свобод', 'выбор', 'зависимост', 'клетк'],
      'творчество': ['творч', 'искусств', 'муза', 'вдохновен'],
    }

    for (const [topic, keywords] of Object.entries(topics)) {
      if (keywords.some(kw => lower.includes(kw))) {
        return topic
      }
    }

    return 'общее'
  }

  private extractPatterns(message: string) {
    const topic = this.extractTopic(message)
    this.db.upsertPattern('topic', topic)

    // Detect self-deception patterns
    const lower = message.toLowerCase()
    const deceptionPatterns: Record<string, string[]> = {
      'оправдание': ['на самом деле', 'просто', 'это не то', 'дело в том', 'просто так вышло'],
      'уверенность': ['я точно', 'я уверен', 'сто процентов', 'я знаю точно'],
      'сомнение': ['не знаю', 'может быть', 'возможно', 'наверное', 'не уверен'],
      'избегание': ['не хочу говорить', 'давай не об этом', 'про это не буду', 'неважно'],
      'сравнение': ['как другие', 'не такой как', 'лучше чем', 'хуже чем'],
    }

    for (const [pattern, keywords] of Object.entries(deceptionPatterns)) {
      if (keywords.some(kw => lower.includes(kw))) {
        this.db.upsertPattern('weakness', pattern)
      }
    }

    // Detect emotional patterns
    const emotionPatterns: Record<string, string[]> = {
      'гнев': ['злюсь', 'бесит', 'ненавиж', 'раздража'],
      'грусть': ['грустно', 'печал', 'тоск', 'депресс'],
      'радость': ['рад', 'счастлив', 'восторг', 'кайф'],
      'тревога': ['тревож', 'волну', 'пережива', 'нервнич'],
      'спокойствие': ['спокой', 'тихо', 'мирно', 'хорошо'],
    }

    for (const [emotion, keywords] of Object.entries(emotionPatterns)) {
      if (keywords.some(kw => lower.includes(kw))) {
        this.db.upsertPattern('emotion', emotion)
      }
    }
  }

  private cosineSimilarity(a: number[], b: number[], aId?: number, bId?: number): number {
    if (a.length !== b.length || a.length === 0) return 0

    let normA: number
    let normB: number

    if (aId !== undefined && this.normCache.has(aId)) {
      const cached = this.normCache.get(aId)!
      normA = cached.norm
    } else {
      normA = 0
      for (let i = 0; i < a.length; i++) normA += a[i] * a[i]
      normA = Math.sqrt(normA)
      if (aId !== undefined) this.normCache.set(aId, { norm: normA, vector: a })
    }

    if (bId !== undefined && this.normCache.has(bId)) {
      const cached = this.normCache.get(bId)!
      normB = cached.norm
    } else {
      normB = 0
      for (let i = 0; i < b.length; i++) normB += b[i] * b[i]
      normB = Math.sqrt(normB)
      if (bId !== undefined) this.normCache.set(bId, { norm: normB, vector: b })
    }

    let dot = 0
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i]
    }
    const denom = normA * normB
    return denom === 0 ? 0 : dot / denom
  }
}
