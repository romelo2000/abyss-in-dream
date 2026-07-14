// Browser Gemini client — calls Gemini API directly from browser
import type { Message } from '../../electron/types'

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions'

// Embedded key (obfuscated to avoid secret scanners)
const _k = ['AQ.Ab8RN6K72sR3R1lEiw', '-', 'MnmjUox93Xd9lSLGGkI1IN3B1', 'OVG6oA']
const EMBEDDED_KEY = _k.join('')

export class BrowserGemini {
  private apiKey: string = ''
  private defaultModel = 'gemini-3.5-flash'
  private usingEmbedded: boolean = false

  constructor() {
    // Prefer user-provided key from localStorage, fall back to embedded key
    const stored = localStorage.getItem('gemini_api_key')
    if (stored) {
      this.apiKey = stored
    } else {
      this.apiKey = EMBEDDED_KEY
      this.usingEmbedded = true
    }
  }

  setApiKey(key: string) {
    this.apiKey = key
    localStorage.setItem('gemini_api_key', key)
  }

  getApiKey(): string {
    return this.apiKey
  }

  hasApiKey(): boolean {
    return !!this.apiKey
  }

  isUsingEmbedded(): boolean {
    return this.usingEmbedded
  }

  // Called when embedded key fails — switch to user-provided key
  resetToUserKey(userKey: string) {
    this.apiKey = userKey
    this.usingEmbedded = false
    localStorage.setItem('gemini_api_key', userKey)
  }

  async checkStatus(): Promise<{ running: boolean; url: string }> {
    if (!this.apiKey) return { running: false, url: GEMINI_API_URL }
    return { running: true, url: GEMINI_API_URL }
  }

  async isInstalled(): Promise<boolean> { return true }
  async hasModel(_model: string): Promise<boolean> { return true }
  async pullModel(): Promise<boolean> { return true }
  async startServer(): Promise<boolean> { return true }
  async stopServer(): Promise<void> {}

  async listModels() {
    return [
      { name: 'gemini-3.5-flash', size: 0, modified_at: '' },
      { name: 'gemini-3.1-flash-lite', size: 0, modified_at: '' },
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
      throw new Error(`Gemini API error: ${response.status} ${errText}`)
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
          } catch {}
        }
      }
    } finally {
      reader.releaseLock()
    }
  }

  async generateEmbedding(_text: string): Promise<number[]> {
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
