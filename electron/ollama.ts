import { spawn, execFile } from 'child_process'
import http from 'http'
import fs from 'fs'
import path from 'path'
import { Message } from './types'

interface OllamaModel {
  name: string
  size: number
  modified_at: string
}

const REQUEST_TIMEOUT = 60000
const STREAM_TIMEOUT = 120000

function getOllamaPath(): string {
  const candidates = [
    '/opt/homebrew/bin/ollama',
    '/usr/local/bin/ollama',
    path.join(process.env.HOME || '', '.ollama', 'bin', 'ollama'),
    '/Applications/Ollama.app/Contents/Resources/ollama',
  ]
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) {
        console.log('Found ollama at:', p)
        return p
      }
    } catch {}
  }
  console.error('Ollama binary not found in any candidate path:', candidates)
  return 'ollama'
}

export class OllamaClient {
  private baseUrl = 'http://127.0.0.1:11434'
  private serverProcess: any = null
  private loadedModels: Set<string> = new Set()
  private modelLoading: Set<string> = new Set()

  async checkStatus(): Promise<{ running: boolean; url: string }> {
    try {
      await this.makeRequest('GET', '/api/tags')
      return { running: true, url: this.baseUrl }
    } catch {
      return { running: false, url: this.baseUrl }
    }
  }

  async isInstalled(): Promise<boolean> {
    return new Promise((resolve) => {
      execFile(getOllamaPath(), ['--version'], (err) => {
        resolve(!err)
      })
    })
  }

  async hasModel(modelName: string): Promise<boolean> {
    if (this.loadedModels.has(modelName)) return true
    try {
      const models = await this.listModels()
      const found = models.some(m => m.name === modelName || m.name.startsWith(modelName + ':'))
      if (found) this.loadedModels.add(modelName)
      return found
    } catch {
      return false
    }
  }

  async pullModel(modelName: string, onProgress?: (progress: string) => void): Promise<boolean> {
    return new Promise((resolve) => {
      const proc = spawn(getOllamaPath(), ['pull', modelName], { stdio: ['ignore', 'pipe', 'pipe'] })
      let output = ''
      proc.stdout?.on('data', (data) => {
        output += data.toString()
        if (onProgress) onProgress(output.trim().split('\n').pop() || '')
      })
      proc.stderr?.on('data', (data) => {
        output += data.toString()
      })
      proc.on('close', (code) => {
        if (code === 0) {
          this.loadedModels.add(modelName)
          resolve(true)
        } else {
          resolve(false)
        }
      })
      proc.on('error', () => resolve(false))
    })
  }

  async startServer(): Promise<boolean> {
    const status = await this.checkStatus()
    if (status.running) return true

    return new Promise((resolve) => {
      let attempts = 0
      let interval: ReturnType<typeof setInterval>

      this.serverProcess = spawn(getOllamaPath(), ['serve'], {
        stdio: 'pipe',
        env: { ...process.env },
      })

      this.serverProcess.stderr?.on('data', (data: Buffer) => {
        const text = data.toString()
        if (text.includes('Listening on')) {
          console.log('Ollama server listening:', text.trim())
        }
      })

      this.serverProcess.on('error', (err: Error) => {
        console.error('Failed to start Ollama server:', err.message)
        if (interval) clearInterval(interval)
        resolve(false)
      })

      // Wait for server to start
      interval = setInterval(async () => {
        attempts++
        const status = await this.checkStatus()
        if (status.running) {
          clearInterval(interval)
          resolve(true)
        } else if (attempts > 20) {
          clearInterval(interval)
          resolve(false)
        }
      }, 500)
    })
  }

  async stopServer(): Promise<void> {
    if (this.serverProcess) {
      try {
        this.serverProcess.kill('SIGTERM')
      } catch {}
      this.serverProcess = null
    }
  }

  async listModels(): Promise<OllamaModel[]> {
    try {
      const data = await this.makeRequest('GET', '/api/tags')
      return data.models || []
    } catch {
      return []
    }
  }

  async *chatStream(
    model: string,
    systemPrompt: string,
    history: Message[],
    userMessage: string
  ): AsyncGenerator<string> {
    // Exclude the last user message from history — it's passed separately as userMessage
    const trimmedHistory = history.slice(-21)
    const lastMsg = trimmedHistory[trimmedHistory.length - 1]
    const historyToSend = (lastMsg && lastMsg.role === 'user' && lastMsg.content === userMessage)
      ? trimmedHistory.slice(0, -1).slice(-20)
      : trimmedHistory.slice(-20)

    const messages = [
      { role: 'system', content: systemPrompt },
      ...historyToSend.map(m => ({
        role: m.role === 'abyss' ? 'assistant' : 'user',
        content: m.content,
      })),
      { role: 'user', content: userMessage },
    ]

    const body = JSON.stringify({
      model,
      messages,
      stream: true,
      options: {
        temperature: 0.9,
        top_p: 0.92,
        top_k: 40,
        num_ctx: 8192,
        num_predict: 2048,
      },
    })

    const response = await this.makeStreamRequest('POST', '/api/chat', body)

    let buffer = ''
    let totalChunks = 0
    const MAX_CHUNKS = 5000
    const INACTIVITY_TIMEOUT = 30000
    let inactivityTimer: ReturnType<typeof setTimeout> | null = null

    const resetInactivityTimer = () => {
      if (inactivityTimer) clearTimeout(inactivityTimer)
      inactivityTimer = setTimeout(() => {
        response.destroy(new Error('Stream inactivity timeout'))
      }, INACTIVITY_TIMEOUT)
    }
    resetInactivityTimer()

    try {
      for await (const chunk of response) {
        resetInactivityTimer()
        buffer += chunk.toString()
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.trim()) continue
          try {
            const json = JSON.parse(line)
            if (json.message?.content) {
              totalChunks++
              if (totalChunks > MAX_CHUNKS) {
                yield '\n\n[Бездна замолчала. Слишком много слов.]'
                return
              }
              yield json.message.content as string
            }
            if (json.done) return
          } catch {
            // partial JSON, skip
          }
        }
      }
    } finally {
      if (inactivityTimer) clearTimeout(inactivityTimer)
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const body = JSON.stringify({
      model: 'bge-m3',
      prompt: text,
    })

    const data = await this.makeRequest('POST', '/api/embeddings', body)
    return data.embedding || []
  }

  async generate(prompt: string, model: string = 'qwen2.5:7b'): Promise<string> {
    const body = JSON.stringify({
      model,
      prompt,
      stream: false,
      options: {
        temperature: 0.7,
        num_predict: 200,
      },
    })

    const data = await this.makeRequest('POST', '/api/generate', body)
    return data.response || ''
  }

  private makeRequest(method: string, path: string, body?: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const url = new URL(path, this.baseUrl)
      const timeout = setTimeout(() => {
        req.destroy(new Error('Request timeout'))
      }, REQUEST_TIMEOUT)
      const req = http.request(
        url,
        {
          method,
          headers: {
            'Content-Type': 'application/json',
            ...(body ? { 'Content-Length': Buffer.byteLength(body) } : {}),
          },
        },
        (res) => {
          clearTimeout(timeout)
          let data = ''
          res.on('data', (chunk) => (data += chunk))
          res.on('end', () => {
            try {
              resolve(JSON.parse(data))
            } catch {
              resolve(data)
            }
          })
        }
      )
      req.on('error', (err) => {
        clearTimeout(timeout)
        reject(err)
      })
      if (body) req.write(body)
      req.end()
    })
  }

  private makeStreamRequest(method: string, path: string, body: string): Promise<http.IncomingMessage> {
    return new Promise((resolve, reject) => {
      const url = new URL(path, this.baseUrl)
      const timeout = setTimeout(() => {
        req.destroy(new Error('Stream connection timeout'))
      }, STREAM_TIMEOUT)
      const req = http.request(
        url,
        {
          method,
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(body),
          },
        },
        (res) => {
          clearTimeout(timeout)
          if (res.statusCode !== 200) {
            reject(new Error(`HTTP ${res.statusCode}`))
            return
          }
          resolve(res)
        }
      )
      req.on('error', (err) => {
        clearTimeout(timeout)
        reject(err)
      })
      req.write(body)
      req.end()
    })
  }
}
