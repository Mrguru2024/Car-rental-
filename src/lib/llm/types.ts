/**
 * LLM Provider Types
 * Model-agnostic types for LLM interactions
 */

export type LLMProvider = 'gemini' | 'groq' | 'ollama' | 'openai'

export interface LLMConfig {
  provider: LLMProvider
  gemini?: {
    apiKey: string
    model: string
  }
  groq?: {
    apiKey: string
    model: string
  }
  ollama?: {
    baseUrl: string
    model: string
  }
  openai?: {
    apiKey: string
    model: string
  }
}

export interface LLMJsonRequest {
  system: string
  user: string
}

export interface LLMJsonResponse<T = any> {
  data: T
  rawResponse?: string
}

export interface LLMError {
  message: string
  provider: LLMProvider
  rawResponse?: string
  statusCode?: number
}
