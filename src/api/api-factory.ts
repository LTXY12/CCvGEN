import type { APIConfig, AIProvider } from '@/types/api'
import type { BaseAIAPI } from './base-api'

import { GeminiAPI } from './gemini-api'
import { ClaudeAPI } from './claude-api'
import { OpenAIAPI } from './openai-api'
import { LocalLLMAPI } from './local-llm-api'

export class APIFactory {
  static createAPI(config: APIConfig): BaseAIAPI {
    switch (config.provider) {
      case 'gemini':
        return new GeminiAPI(config)
      
      case 'claude':
        return new ClaudeAPI(config)
      
      case 'openai':
      case 'custom-openai':
        return new OpenAIAPI(config)
      
      case 'ollama':
      case 'lm-studio':
        return new LocalLLMAPI(config)
      
      default:
        throw new Error(`Unsupported AI provider: ${config.provider}`)
    }
  }

  static validateConfig(config: APIConfig): boolean {
    try {
      switch (config.provider) {
        case 'gemini':
        case 'claude':
        case 'openai':
          return !!config.apiKey

        case 'custom-openai':
          return !!config.apiKey && !!config.endpoint

        case 'ollama':
        case 'lm-studio':
          return true // Local APIs don't require API keys

        default:
          return false
      }
    } catch {
      return false
    }
  }

  static getDefaultModel(provider: AIProvider): string {
    switch (provider) {
      case 'gemini':
        return 'gemini-1.5-flash'
      case 'claude':
        return 'claude-3-5-sonnet-20241022'
      case 'openai':
        return 'gpt-4o'
      case 'custom-openai':
        return 'gpt-4o'
      case 'ollama':
        return 'llama3.2'
      case 'lm-studio':
        return 'local-model'
      default:
        return 'unknown'
    }
  }

  static getDefaultEndpoint(provider: AIProvider): string | undefined {
    switch (provider) {
      case 'ollama':
        return 'http://localhost:11434/api/generate'
      case 'lm-studio':
        return 'http://localhost:1234/v1/chat/completions'
      default:
        return undefined
    }
  }
}