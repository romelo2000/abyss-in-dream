import { contextBridge, ipcRenderer } from 'electron'
import type { AbyssApi } from './shared-abyss-api'

const api: AbyssApi = {
  ollama: {
    status: () => ipcRenderer.invoke('ollama:status'),
    models: () => ipcRenderer.invoke('ollama:models'),
    start: () => ipcRenderer.invoke('ollama:start'),
    isInstalled: () => ipcRenderer.invoke('ollama:is-installed'),
    hasModel: (model: string) => ipcRenderer.invoke('ollama:has-model', model),
    pullModel: (model: string) => ipcRenderer.invoke('ollama:pull-model', model),
    onPullProgress: (callback: (data: { model: string; progress: string }) => void) => {
      const handler = (_e: any, data: { model: string; progress: string }) => callback(data)
      ipcRenderer.on('ollama:pull-progress', handler)
      return () => ipcRenderer.removeListener('ollama:pull-progress', handler)
    },
  },
  session: {
    create: (dreamScene: string, model: string) => ipcRenderer.invoke('session:create', dreamScene, model),
    list: () => ipcRenderer.invoke('session:list'),
    get: (id: number) => ipcRenderer.invoke('session:get', id),
    messages: (id: number) => ipcRenderer.invoke('session:messages', id),
    delete: (id: number) => ipcRenderer.invoke('session:delete', id),
    end: (id: number) => ipcRenderer.invoke('session:end', id),
  },
  chat: {
    send: (data: { sessionId: number; message: string; model: string; forceMode?: string }) =>
      ipcRenderer.invoke('chat:send', data),
    onChunk: (callback: (data: { sessionId: number; chunk: string }) => void) =>
      ipcRenderer.on('chat:chunk', (_e, data) => callback(data)),
    onError: (callback: (data: { sessionId: number; error: string }) => void) =>
      ipcRenderer.on('chat:error', (_e, data) => callback(data)),
    onStatus: (callback: (data: { sessionId: number; status: string }) => void) =>
      ipcRenderer.on('chat:status', (_e, data) => callback(data)),
    removeAllListeners: () => {
      ipcRenderer.removeAllListeners('chat:chunk')
      ipcRenderer.removeAllListeners('chat:error')
      ipcRenderer.removeAllListeners('chat:status')
    },
  },
  metrics: {
    get: (sessionId: number) => ipcRenderer.invoke('metrics:get', sessionId),
    all: () => ipcRenderer.invoke('metrics:all'),
  },
  insight: {
    save: (sessionId: number, content: string) => ipcRenderer.invoke('insight:save', sessionId, content),
    list: (sessionId?: number) => ipcRenderer.invoke('insight:list', sessionId),
    delete: (id: number) => ipcRenderer.invoke('insight:delete', id),
  },
  memory: {
    search: (query: string) => ipcRenderer.invoke('memory:search', query),
    patterns: () => ipcRenderer.invoke('memory:patterns'),
    welcome: () => ipcRenderer.invoke('memory:welcome'),
  },
  settings: {
    get: (key: string) => ipcRenderer.invoke('settings:get', key),
    set: (key: string, value: string) => ipcRenderer.invoke('settings:set', key, value),
  },
  awakening: {
    get: () => ipcRenderer.invoke('awakening:get'),
    update: (sessionId: number) => ipcRenderer.invoke('awakening:update', sessionId),
  },
  game: {
    achievements: () => ipcRenderer.invoke('game:achievements'),
    koanOfDay: () => ipcRenderer.invoke('game:koan-of-day'),
    egoDeaths: () => ipcRenderer.invoke('game:ego-deaths'),
    weeklyStats: () => ipcRenderer.invoke('game:weekly-stats'),
    sessionResult: (sessionId: number) => ipcRenderer.invoke('game:session-result', sessionId),
    paradoxScore: () => ipcRenderer.invoke('game:paradox-score'),
    karma: () => ipcRenderer.invoke('game:karma'),
    dreamInvasion: () => ipcRenderer.invoke('game:dream-invasion'),
    dailyChallenge: () => ipcRenderer.invoke('game:daily-challenge'),
    setChallenge: (sessionId: number, challengeId: string) => ipcRenderer.invoke('game:set-challenge', sessionId, challengeId),
    exportBook: () => ipcRenderer.invoke('game:export-book'),
  },
  mirror: {
    save: (sessionId: number, quote: string, comment: string, mode: string) =>
      ipcRenderer.invoke('mirror:save', sessionId, quote, comment, mode),
    list: () => ipcRenderer.invoke('mirror:list'),
    delete: (id: number) => ipcRenderer.invoke('mirror:delete', id),
  },
}

contextBridge.exposeInMainWorld('abyss', api)
