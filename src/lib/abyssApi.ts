// Unified API — returns webApi in browser, window.abyss in Electron
import { webApi } from './webApi'

const isElectron = typeof window !== 'undefined' && (window as any).abyss !== undefined

export const abyss = isElectron ? (window as any).abyss : webApi

// In web mode, expose gemini and webllm clients
export const webGemini = !isElectron ? (webApi as any)._gemini : null
export const webLLM = !isElectron ? (webApi as any)._webllm : null
export const setLLMMode = !isElectron ? (webApi as any)._setLLMMode : null
export const getLLMMode = !isElectron ? (webApi as any)._getLLMMode : null
