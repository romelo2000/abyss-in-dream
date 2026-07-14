// Unified API — returns webApi in browser, window.abyss in Electron
import { webApi } from './webApi'

const isElectron = typeof window !== 'undefined' && (window as any).abyss !== undefined

export const abyss = isElectron ? (window as any).abyss : webApi

// In web mode, expose gemini client for API key management
export const webGemini = !isElectron ? (webApi as any)._gemini : null
