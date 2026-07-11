// Type definition for the window.abyss API exposed by preload script
// This is re-exported from shared so both electron and frontend can use it

export interface AbyssApi {
  ollama: {
    status: () => Promise<{ running: boolean; url: string }>
    models: () => Promise<{ name: string; size: number; modified_at: string }[]>
    start: () => Promise<boolean>
    isInstalled: () => Promise<boolean>
    hasModel: (model: string) => Promise<boolean>
    pullModel: (model: string) => Promise<boolean>
    onPullProgress: (callback: (data: { model: string; progress: string }) => void) => () => void
  }
  session: {
    create: (dreamScene: string, model: string) => Promise<any>
    list: () => Promise<any[]>
    get: (id: number) => Promise<any | undefined>
    messages: (id: number) => Promise<any[]>
    delete: (id: number) => Promise<boolean>
    end: (id: number) => Promise<{ result: any; awakening: number }>
    exportMd: (sessionId: number) => Promise<string | null>
  }
  chat: {
    send: (data: { sessionId: number; message: string; model: string; forceMode?: string; responseTimeMs?: number }) => Promise<{ message: any; mode: string; shadow?: string | null }>
    onChunk: (callback: (data: { sessionId: number; chunk: string }) => void) => void
    onError: (callback: (data: { sessionId: number; error: string }) => void) => void
    onStatus: (callback: (data: { sessionId: number; status: string }) => void) => void
    removeAllListeners: () => void
  }
  metrics: {
    get: (sessionId: number) => Promise<any | undefined>
    all: () => Promise<any[]>
  }
  insight: {
    save: (sessionId: number, content: string) => Promise<any>
    list: (sessionId?: number) => Promise<any[]>
    delete: (id: number) => Promise<boolean>
  }
  memory: {
    search: (query: string) => Promise<any[]>
    patterns: () => Promise<any[]>
    welcome: () => Promise<string>
    echoKeywords: (sessionId: number) => Promise<string[]>
  }
  settings: {
    get: (key: string) => Promise<string | undefined>
    set: (key: string, value: string) => Promise<void>
  }
  awakening: {
    get: () => Promise<number>
    update: (sessionId: number) => Promise<number>
  }
  game: {
    achievements: () => Promise<any[]>
    koanOfDay: () => Promise<string>
    egoDeaths: () => Promise<number>
    weeklyStats: () => Promise<any>
    sessionResult: (sessionId: number) => Promise<any>
    paradoxScore: () => Promise<number>
    karma: () => Promise<number>
    dreamInvasion: () => Promise<string | null>
    dailyChallenge: () => Promise<any | null>
    setChallenge: (sessionId: number, challengeId: string) => Promise<boolean>
    exportBook: () => Promise<string | null>
  }
  mirror: {
    save: (sessionId: number, quote: string, comment: string, mode: string) => Promise<any>
    list: () => Promise<any[]>
    delete: (id: number) => Promise<void>
  }
}
