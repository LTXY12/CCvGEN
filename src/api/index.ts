// Export all API classes and factory
export { BaseAIAPI } from './base-api'
export { GeminiAPI, createGeminiAPI } from './gemini-api'
export { ClaudeAPI, createClaudeAPI } from './claude-api'
export { OpenAIAPI, createOpenAIAPI, createCustomOpenAIAPI } from './openai-api'
export { LocalLLMAPI, createOllamaAPI, createLMStudioAPI } from './local-llm-api'
export { APIFactory } from './api-factory'

// Re-export types
export type { APIConfig, AIProvider, AIResponse, GenerationRequest } from '@/types/api'