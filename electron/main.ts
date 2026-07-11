import { app, BrowserWindow, ipcMain, shell, dialog } from 'electron'
import path from 'path'
import { DatabaseManager } from './database'
import { OllamaClient } from './ollama'
import { MemorySystem } from './memory'
import { AbyssEngine } from './abyss'
import { AbyssMode } from './types'

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err.message)
})

let mainWindow: BrowserWindow | null = null
let db: DatabaseManager | null = null
let ollama: OllamaClient | null = null
let memory: MemorySystem | null = null
let abyss: AbyssEngine | null = null

const isDev = process.env.NODE_ENV === 'development'

function getAssetPath(...segments: string[]): string {
  if (isDev) {
    return path.join(__dirname, '..', ...segments)
  }
  return path.join(process.resourcesPath, ...segments)
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    frame: true,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#05060f',
    icon: getAssetPath('resources', 'icon.icns'),
    webPreferences: {
      preload: isDev
        ? path.join(__dirname, 'preload.js')
        : path.join(process.resourcesPath, 'app.asar', 'dist-electron', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
  } else {
    mainWindow.loadFile(getAssetPath('app.asar', 'dist', 'index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  mainWindow.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    console.log(`[RENDERER ${level}] ${sourceId}:${line} ${message}`)
    if (level === 3) {
      const fs = require('fs')
      const path = require('path')
      const logPath = path.join(require('electron').app.getPath('userData'), 'renderer-errors.log')
      fs.appendFileSync(logPath, `[${new Date().toISOString()}] ${message}\n  Source: ${sourceId}:${line}\n\n`)
    }
  })

  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    console.error('[RENDERER CRASH]', details)
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })
}

app.whenReady().then(async () => {
  const userDataPath = app.getPath('userData')
  db = new DatabaseManager(path.join(userDataPath, 'abyss.db'))
  ollama = new OllamaClient()
  memory = new MemorySystem(db, ollama)
  abyss = new AbyssEngine(ollama, db, memory)

  try {
    await db.init()
    await memory.init()
  } catch (err) {
    console.error('Database init failed:', err)
  }

  // Start Ollama server in background (non-blocking)
  console.log('Starting Ollama server...')
  ollama.startServer().then((ok) => {
    console.log('Ollama server started:', ok)
  }).catch((err) => {
    console.error('Ollama start failed:', err)
  })

  setupIpcHandlers()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  app.quit()
})

app.on('before-quit', async (event) => {
  if (db) {
    db.close()
  }
  if (ollama) {
    event.preventDefault()
    console.log('Stopping Ollama server...')
    await ollama.stopServer()
    console.log('Ollama server stopped')
    app.exit(0)
  }
})

function setupIpcHandlers() {
  // Ollama status
  ipcMain.handle('ollama:status', async () => {
    return ollama!.checkStatus()
  })

  ipcMain.handle('ollama:models', async () => {
    return ollama!.listModels()
  })

  ipcMain.handle('ollama:start', async () => {
    return ollama!.startServer()
  })

  ipcMain.handle('ollama:is-installed', async () => {
    return ollama!.isInstalled()
  })

  ipcMain.handle('ollama:has-model', async (_e, modelName: string) => {
    return ollama!.hasModel(modelName)
  })

  ipcMain.handle('ollama:pull-model', async (event, modelName: string) => {
    return ollama!.pullModel(modelName, (progress) => {
      event.sender.send('ollama:pull-progress', { model: modelName, progress })
    })
  })

  // Sessions
  ipcMain.handle('session:create', async (_e, dreamScene: string, model: string) => {
    return db!.createSession(dreamScene, model)
  })

  ipcMain.handle('session:list', async () => {
    return db!.listSessions()
  })

  ipcMain.handle('session:get', async (_e, id: number) => {
    return db!.getSession(id)
  })

  ipcMain.handle('session:messages', async (_e, id: number) => {
    return db!.getSessionMessages(id)
  })

  ipcMain.handle('session:delete', async (_e, id: number) => {
    return db!.deleteSession(id)
  })

  ipcMain.handle('session:end', async (_e, id: number) => {
    const result = abyss!.onSessionEnd(id)
    db!.endSession(id)
    return { result, awakening: db!.getAwakeningLevel() }
  })

  // Chat
  ipcMain.handle('chat:send', async (event, { sessionId, message, model, forceMode }: {
    sessionId: number
    message: string
    model: string
    forceMode?: string
  }) => {
    const userMsg = db!.addMessage(sessionId, 'user', message, null)
    
    // Get conversation context
    const history = db!.getSessionMessages(sessionId)
    const memoryContext = await memory!.getRelevantMemory(message, sessionId)
    const userPatterns = memory!.getUserPatterns()
    
    // Select mode
    const mode = (forceMode || abyss!.selectMode(message, history, userPatterns)) as AbyssMode

    // Check if Ollama is available
    const ollamaStatus = await ollama!.checkStatus()
    if (!ollamaStatus.running) {
      const demoResponse = abyss!.getDemoResponse(message, mode)
      event.sender.send('chat:chunk', { sessionId, chunk: demoResponse })
      const abyssMsg = db!.addMessage(sessionId, 'abyss', demoResponse, 'demo')
      abyss!.updateMetrics(sessionId, message, demoResponse, mode, 0)
      return { message: abyssMsg, mode: 'demo' }
    }

    // Check if model is available
    const hasModel = await ollama!.hasModel(model)
    if (!hasModel) {
      const errorMsg = `Бездна молчит. Модель «${model}» не найдена.\n\nОткрой терминал и выполни:\nollama pull ${model}\n\nИли выбери другую модель в настройках.`
      event.sender.send('chat:chunk', { sessionId, chunk: errorMsg })
      const abyssMsg = db!.addMessage(sessionId, 'abyss', errorMsg, 'error')
      return { message: abyssMsg, mode: 'error' }
    }

    // Notify renderer that model is loading (first request to a model can be slow)
    event.sender.send('chat:status', { sessionId, status: 'loading-model' })
    
    // Get game context
    const session = db!.getSession(sessionId)
    const echoText = abyss!.getEchoText(sessionId)
    const dreamVoice = abyss!.getDreamVoice()
    const karmaMsg = abyss!.getKarmaMessage(sessionId)
    const userMsgCount = history.filter(m => m.role === 'user').length
    const shouldSilence = userMsgCount >= 2 && abyss!.shouldSilence()
    
    // Shadow echo
    const shadowEcho = abyss!.getShadowEcho(sessionId)
    
    // Dream within dream
    const dreamWithinDream = abyss!.shouldDreamWithinDream()
    
    // Word price hint
    const wordPriceHint = abyss!.getWordPriceHint(userMsgCount)
    
    // Mirror of truth
    const shouldMirror = abyss!.shouldOfferMirror(sessionId, userMsgCount)
    
    // Council of Abyss
    const shouldCouncil = abyss!.shouldCouncil(userMsgCount)
    
    // Daily challenge
    let challengePrompt = ''
    if (session?.challenge_id) {
      challengePrompt = abyss!.getChallengePrompt(session.challenge_id)
    }
    
    // Build system prompt
    let systemPrompt = abyss!.buildSystemPrompt(mode, memoryContext, userPatterns, history, session, echoText, dreamVoice)
    
    // Append special prompts
    if (shadowEcho) systemPrompt += `\n\n${shadowEcho}`
    if (dreamWithinDream) systemPrompt += `\n\nСОН ВНУТРИ СНА: ${abyss!.getDreamWithinDreamPrompt()}`
    if (shouldMirror) {
      systemPrompt += abyss!.getMirrorOfTruthPrompt(sessionId)
      db!.setMirrorUsed(sessionId)
    }
    if (shouldCouncil) {
      systemPrompt += abyss!.getCouncilPrompt()
    }
    if (challengePrompt) {
      systemPrompt += challengePrompt
    }
    
    // Stream response
    const responseChunks: string[] = []
    
    try {
      // Silence mechanic
      if (shouldSilence) {
        const silenceMsg = abyss!.getSilenceMessage()
        db!.incrementSilence(sessionId)
        event.sender.send('chat:chunk', { sessionId, chunk: silenceMsg })
        const abyssMsg = db!.addMessage(sessionId, 'abyss', silenceMsg, 'silence')
        abyss!.updateMetrics(sessionId, message, silenceMsg, mode, userMsgCount)
        return { message: abyssMsg, mode: 'silence' }
      }

      // Karma message prepend
      if (karmaMsg) {
        event.sender.send('chat:chunk', { sessionId, chunk: karmaMsg + '\n\n' })
        responseChunks.push(karmaMsg + '\n\n')
      }

      // Word price hint prepend
      if (wordPriceHint) {
        event.sender.send('chat:chunk', { sessionId, chunk: wordPriceHint + '\n\n' })
        responseChunks.push(wordPriceHint + '\n\n')
      }

      for await (const chunk of ollama!.chatStream(model, systemPrompt, history, message)) {
        responseChunks.push(chunk)
        event.sender.send('chat:chunk', { sessionId, chunk })
      }
      
      const fullResponse = responseChunks.join('')
      const abyssMsg = db!.addMessage(sessionId, 'abyss', fullResponse, mode)
      
      // Update memory in background (non-blocking)
      memory!.processInteraction(message, fullResponse, sessionId, mode).catch((err) => {
        console.error('Memory processing error:', err)
      })
      
      // Update metrics
      abyss!.updateMetrics(sessionId, message, fullResponse, mode, userMsgCount)
      
      return { message: abyssMsg, mode }
    } catch (err) {
      event.sender.send('chat:error', { sessionId, error: String(err) })
      throw err
    }
  })

  // Metrics
  ipcMain.handle('metrics:get', async (_e, sessionId: number) => {
    return db!.getMetrics(sessionId)
  })

  ipcMain.handle('metrics:all', async () => {
    return db!.getAllMetrics()
  })

  // Insights
  ipcMain.handle('insight:save', async (_e, sessionId: number, content: string) => {
    return db!.saveInsight(sessionId, content)
  })

  ipcMain.handle('insight:list', async (_e, sessionId?: number) => {
    return db!.listInsights(sessionId)
  })

  ipcMain.handle('insight:delete', async (_e, id: number) => {
    return db!.deleteInsight(id)
  })

  // Memory
  ipcMain.handle('memory:search', async (_e, query: string) => {
    return memory!.searchMemory(query)
  })

  ipcMain.handle('memory:patterns', async () => {
    return memory!.getUserPatterns()
  })

  ipcMain.handle('memory:welcome', async () => {
    return memory!.getWelcomeMessage()
  })

  // Settings
  ipcMain.handle('settings:get', async (_e, key: string) => {
    return db!.getSetting(key)
  })

  ipcMain.handle('settings:set', async (_e, key: string, value: string) => {
    return db!.setSetting(key, value)
  })

  // Awakening level
  ipcMain.handle('awakening:get', async () => {
    return db!.getAwakeningLevel()
  })

  ipcMain.handle('awakening:update', async (_e, sessionId: number) => {
    return abyss!.calculateAwakening(sessionId)
  })

  // Game mechanics
  ipcMain.handle('game:achievements', async () => {
    const unlocked = db!.getAchievements()
    const { ACHIEVEMENTS } = require('./types')
    return ACHIEVEMENTS.map((a: any) => {
      const u = unlocked.find(x => x.id === a.id)
      return { ...a, unlocked: u?.unlocked || false, unlocked_at: u?.unlocked_at || null }
    })
  })

  ipcMain.handle('game:koan-of-day', async () => {
    return db!.getKoanOfDay()
  })

  ipcMain.handle('game:ego-deaths', async () => {
    return db!.getTotalEgoDeaths()
  })

  ipcMain.handle('game:weekly-stats', async () => {
    return db!.getWeeklyStats()
  })

  ipcMain.handle('game:session-result', async (_e, sessionId: number) => {
    return abyss!.determineGameResult(sessionId)
  })

  // Broken Mirrors
  ipcMain.handle('mirror:save', async (_e, sessionId: number, quote: string, comment: string, mode: string) => {
    return abyss!.saveBrokenMirror(sessionId, quote, comment, mode)
  })

  ipcMain.handle('mirror:list', async () => {
    return db!.listBrokenMirrors()
  })

  ipcMain.handle('mirror:delete', async (_e, id: number) => {
    return db!.deleteBrokenMirror(id)
  })

  // Paradox score
  ipcMain.handle('game:paradox-score', async () => {
    return db!.getTotalParadoxScore()
  })

  // Karma
  ipcMain.handle('game:karma', async () => {
    return db!.getTotalKarma()
  })

  // Dream Invasion
  ipcMain.handle('game:dream-invasion', async () => {
    return abyss!.getDreamInvasion()
  })

  // Daily Challenge
  ipcMain.handle('game:daily-challenge', async () => {
    return abyss!.getDailyChallenge()
  })

  ipcMain.handle('game:set-challenge', async (_e, sessionId: number, challengeId: string) => {
    abyss!.setSessionChallenge(sessionId, challengeId)
    return true
  })

  // Book of Abyss — export player journey
  ipcMain.handle('game:export-book', async () => {
    const sessions = db!.listSessions()
    const mirrors = db!.listBrokenMirrors()
    const awakening = db!.getAwakeningLevel()
    const egoDeaths = db!.getTotalEgoDeaths()
    const paradoxScore = db!.getTotalParadoxScore()
    const karma = db!.getTotalKarma()

    const { exportBook } = require('./exportBook')
    return exportBook(sessions, mirrors, awakening, egoDeaths, paradoxScore, karma)
  })
}
