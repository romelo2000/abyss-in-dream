// WebLLM client — runs LLM entirely in browser via WebGPU, no API key needed
import type { Message } from '../../electron/types'

export class WebLLMClient {
  private engine: any = null
  private initialized = false
  private loading = false
  private modelId = 'Llama-3.2-1B-Instruct-q4f32_1-MLC'
  private initProgress: ((progress: number, text: string) => void) | null = null

  setProgressCallback(cb: (progress: number, text: string) => void) {
    this.initProgress = cb
  }

  isReady(): boolean {
    return this.initialized
  }

  isLoading(): boolean {
    return this.loading
  }

  async init(): Promise<void> {
    if (this.initialized || this.loading) return
    this.loading = true

    try {
      const { CreateMLCEngine } = await import('@mlc-ai/web-llm')
      this.engine = await CreateMLCEngine(
        this.modelId,
        {
          initProgressCallback: (report: any) => {
            if (this.initProgress) {
              this.initProgress(report.progress, report.text)
            }
          },
        }
      )
      this.initialized = true
      this.loading = false
    } catch (err) {
      this.loading = false
      throw err
    }
  }

  setApiKey(_key: string) {
    // No-op — WebLLM doesn't use API keys
  }

  getApiKey(): string {
    return ''
  }

  hasApiKey(): boolean {
    return true
  }

  isUsingEmbedded(): boolean {
    return true
  }

  resetToUserKey(_key: string) {
    // No-op
  }

  async checkStatus(): Promise<{ running: boolean; url: string }> {
    return { running: this.initialized, url: 'webgpu://local' }
  }

  async isInstalled(): Promise<boolean> { return true }
  async hasModel(_model: string): Promise<boolean> { return this.initialized }
  async pullModel(): Promise<boolean> { await this.init(); return true }
  async startServer(): Promise<boolean> { await this.init(); return true }
  async stopServer(): Promise<void> {}

  async listModels() {
    return [
      { name: 'Llama-3.2-1B-Instruct-q4f32_1-MLC', size: 0, modified_at: '' },
      { name: 'Llama-3.2-3B-Instruct-q4f32_1-MLC', size: 0, modified_at: '' },
      { name: 'Qwen2.5-1.5B-Instruct-q4f32_1-MLC', size: 0, modified_at: '' },
    ]
  }

  async *chatStream(
    _model: string,
    systemPrompt: string,
    history: Message[],
    userMessage: string
  ): AsyncGenerator<string> {
    if (!this.initialized) {
      await this.init()
    }

    const trimmedHistory = history.slice(-20)
    const lastMsg = trimmedHistory[trimmedHistory.length - 1]
    const historyToSend = (lastMsg && lastMsg.role === 'user' && lastMsg.content === userMessage)
      ? trimmedHistory.slice(0, -1).slice(-19)
      : trimmedHistory.slice(-19)

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...historyToSend.map(m => ({
        role: (m.role === 'abyss' ? 'assistant' : 'user') as 'assistant' | 'user',
        content: m.content,
      })),
      { role: 'user' as const, content: userMessage },
    ]

    const chunks: any[] = []
    const completion = await this.engine.chat.completions.create({
      messages,
      stream: true,
      temperature: 0.9,
      top_p: 0.92,
      max_tokens: 4096,
    })

    for await (const chunk of completion) {
      const delta = chunk.choices?.[0]?.delta?.content
      if (delta) {
        yield delta as string
      }
    }
  }

  async generateEmbedding(_text: string): Promise<number[]> {
    return []
  }

  async generate(prompt: string, _model?: string): Promise<string> {
    if (!this.initialized) {
      await this.init()
    }

    const completion = await this.engine.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      stream: false,
      temperature: 0.7,
      max_tokens: 200,
    })

    return completion.choices?.[0]?.message?.content || ''
  }
}
