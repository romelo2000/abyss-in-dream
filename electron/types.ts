export * from './shared-types'

export interface Message {
  id: number
  session_id: number
  role: string
  content: string
  mode: string | null
  timestamp: string
}
