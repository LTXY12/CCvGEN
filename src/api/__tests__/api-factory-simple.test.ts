import { APIFactory } from '../api-factory'
import type { APIConfig } from '@/types/api'

// Mock all API classes to avoid importing actual SDKs
jest.mock('../gemini-api', () => ({
  GeminiAPI: jest.fn()
}))

jest.mock('../claude-api', () => ({
  ClaudeAPI: jest.fn()
}))

jest.mock('../openai-api', () => ({
  OpenAIAPI: jest.fn()
}))

jest.mock('../local-llm-api', () => ({
  LocalLLMAPI: jest.fn()
}))

describe('APIFactory', () => {
  describe('validateConfig', () => {
    test('should validate Gemini config', () => {
      const config: APIConfig = {
        provider: 'gemini',
        apiKey: 'test-key'
      }
      expect(APIFactory.validateConfig(config)).toBe(true)
    })

    test('should validate Claude config', () => {
      const config: APIConfig = {
        provider: 'claude',
        apiKey: 'test-key'
      }
      expect(APIFactory.validateConfig(config)).toBe(true)
    })

    test('should validate OpenAI config', () => {
      const config: APIConfig = {
        provider: 'openai',
        apiKey: 'test-key'
      }
      expect(APIFactory.validateConfig(config)).toBe(true)
    })

    test('should validate custom OpenAI config', () => {
      const config: APIConfig = {
        provider: 'custom-openai',
        apiKey: 'test-key',
        endpoint: 'https://api.example.com'
      }
      expect(APIFactory.validateConfig(config)).toBe(true)
    })

    test('should validate Ollama config', () => {
      const config: APIConfig = {
        provider: 'ollama'
      }
      expect(APIFactory.validateConfig(config)).toBe(true)
    })

    test('should validate LM Studio config', () => {
      const config: APIConfig = {
        provider: 'lm-studio'
      }
      expect(APIFactory.validateConfig(config)).toBe(true)
    })

    test('should reject invalid configs', () => {
      const invalidConfigs: APIConfig[] = [
        { provider: 'gemini' }, // Missing API key
        { provider: 'claude' }, // Missing API key
        { provider: 'openai' }, // Missing API key
        { provider: 'custom-openai', apiKey: 'test' }, // Missing endpoint
      ]

      invalidConfigs.forEach(config => {
        expect(APIFactory.validateConfig(config)).toBe(false)
      })
    })
  })

  describe('getDefaultModel', () => {
    test('should return correct default models', () => {
      expect(APIFactory.getDefaultModel('gemini')).toBe('gemini-1.5-flash')
      expect(APIFactory.getDefaultModel('claude')).toBe('claude-3-5-sonnet-20241022')
      expect(APIFactory.getDefaultModel('openai')).toBe('gpt-4o')
      expect(APIFactory.getDefaultModel('ollama')).toBe('llama3.2')
      expect(APIFactory.getDefaultModel('lm-studio')).toBe('local-model')
    })
  })

  describe('getDefaultEndpoint', () => {
    test('should return correct default endpoints', () => {
      expect(APIFactory.getDefaultEndpoint('ollama')).toBe('http://localhost:11434/api/generate')
      expect(APIFactory.getDefaultEndpoint('lm-studio')).toBe('http://localhost:1234/v1/chat/completions')
      expect(APIFactory.getDefaultEndpoint('gemini')).toBeUndefined()
      expect(APIFactory.getDefaultEndpoint('claude')).toBeUndefined()
    })
  })
})