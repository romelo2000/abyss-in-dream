import { Message } from '../electron/types'

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_MODELS_URL = 'https://api.groq.com/openai/v1/models'

interface GroqModel {
  name: string
  size: number
  modified_at: string
}

export class GroqClient {
  private apiKey: string
  private defaultModel = 'llama-3.3-70b-versatile'

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.GROQ_API_KEY || ''
    if (!this.apiKey) {
      console.warn('GROQ_API_KEY not set — Groq client will not work')
    }
  }

  async checkStatus(): Promise<{ running: boolean; url: string }> {
    if (!this.apiKey) return { running: false, url: GROQ_API_URL }
    try {
      const res = await fetch(GROQ_MODELS_URL, {
        headers: { Authorization: `Bearer ${this.apiKey}` },
      })
      return { running: res.ok, url: GROQ_API_URL }
    } catch {
      return { running: false, url: GROQ_API_URL }
    }
  }

  async isInstalled(): Promise<boolean> {
    return true
  }

  async hasModel(_model: string): Promise<boolean> {
    return true
  }

  async pullModel(_model: string, _onProgress?: (progress: string) => void): Promise<boolean> {
    return true
  }

  async startServer(): Promise<boolean> {
    return true
  }

  async stopServer(): Promise<void> {}

  async listModels(): Promise<GroqModel[]> {
    return [
      { name: 'llama-3.3-70b-versatile', size: 0, modified_at: '' },
      { name: 'llama-3.1-8b-instant', size: 0, modified_at: '' },
      { name: 'deepseek-r1-distill-llama-70b', size: 0, modified_at: '' },
    ]
  }

  async *chatStream(
    _model: string,
    systemPrompt: string,
    history: Message[],
    userMessage: string
  ): AsyncGenerator<string> {
    const trimmedHistory = history.slice(-21)
    const lastMsg = trimmedHistory[trimmedHistory.length - 1]
    const historyToSend = (lastMsg && lastMsg.role === 'user' && lastMsg.content === userMessage)
      ? trimmedHistory.slice(0, -1).slice(-20)
      : trimmedHistory.slice(-20)

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...historyToSend.map(m => ({
        role: (m.role === 'abyss' ? 'assistant' : 'user') as 'assistant' | 'user',
        content: m.content,
      })),
      { role: 'user' as const, content: userMessage },
    ]

    const body = JSON.stringify({
      model: this.defaultModel,
      messages,
      stream: true,
      temperature: 0.9,
      top_p: 0.92,
      max_tokens: 4096,
    })

    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body,
    })

    if (!response.ok || !response.body) {
      throw new Error(`Groq API error: ${response.status} ${response.statusText}`)
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let totalChunks = 0
    const MAX_CHUNKS = 5000

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.trim() || !line.startsWith('data: ')) continue
          const data = line.slice(6).trim()
          if (data === '[DONE]') return
          try {
            const json = JSON.parse(data)
            if (json.choices?.[0]?.delta?.content) {
              totalChunks++
              if (totalChunks > MAX_CHUNKS) {
                yield '\n\n[Бездна замолчала. Слишком много слов.]'
                return
              }
              yield json.choices[0].delta.content as string
            }
          } catch {
            // partial JSON, skip
          }
        }
      }
    } finally {
      reader.releaseLock()
    }
  }

  async generateEmbedding(_text: string): Promise<number[]> {
    // Groq doesn't provide embeddings — return empty, memory system handles gracefully
    return []
  }

  async generate(prompt: string, _model?: string): Promise<string> {
    const body = JSON.stringify({
      model: this.defaultModel,
      messages: [{ role: 'user', content: prompt }],
      stream: false,
      temperature: 0.7,
      max_tokens: 200,
    })

    const res = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body,
    })

    if (!res.ok) throw new Error(`Groq API error: ${res.status}`)
    const data = await res.json()
    return data.choices?.[0]?.message?.content || ''
  }
}
