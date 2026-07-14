import type { AbyssApi } from '../shared/abyss-api'

declare global {
  interface Window {
    abyss?: AbyssApi
  }
}

export {}
