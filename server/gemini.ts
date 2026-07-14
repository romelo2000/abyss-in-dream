import { Message } from '../electron/types'

// Gemini OpenAI-compatible endpoint
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions'
const GEMINI_MODELS_URL = 'https://generativelanguage.googleapis.com/v1beta/openai/models'

interface LlmModel {
  name: string
  size: number
  modified_at: string
}

export class GeminiClient {
  private apiKey: string
  private defaultModel = 'gemini-3.5-flash'

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || ''
    if (!this.apiKey) {
      console.warn('GEMINI_API_KEY not set — Gemini client will not work')
    }
  }

  async checkStatus(): Promise<{ running: boolean; url: string }> {
    if (!this.apiKey) return { running: false, url: GEMINI_API_URL }
    try {
      const res = await fetch(GEMINI_MODELS_URL, {
        headers: { Authorization: `Bearer ${this.apiKey}` },
      })
      return { running: res.ok, url: GEMINI_API_URL }
    } catch {
      return { running: false, url: GEMINI_API_URL }
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

  async listModels(): Promise<LlmModel[]> {
    return [
      { name: 'gemini-2.5-flash', size: 0, modified_at: '' },
      { name: 'gemini-2.5-pro', size: 0, modified_at: '' },
      { name: 'gemini-2.0-flash', size: 0, modified_at: '' },
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

    const response = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body,
    })

    if (!response.ok || !response.body) {
      const errText = await response.text().catch(() => '')
      throw new Error(`Gemini API error: ${response.status} ${response.statusText} ${errText}`)
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
    // Gemini doesn't provide free embeddings via OpenAI-compatible endpoint
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

    const res = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body,
    })

    if (!res.ok) throw new Error(`Gemini API error: ${res.status}`)
    const data = await res.json()
    return data.choices?.[0]?.message?.content || ''
  }
}
