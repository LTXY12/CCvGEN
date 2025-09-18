import { GoogleGenerativeAI } from '@google/generative-ai'
import { BaseAIAPI } from './base-api'
import type { AIResponse, GenerationRequest } from '@/types/api'

export class GeminiAPI extends BaseAIAPI {
  private client: GoogleGenerativeAI | null = null

  private initializeClient(): void {
    if (!this.client && this.config.apiKey) {
      this.client = new GoogleGenerativeAI(this.config.apiKey)
    }
  }

  async generateText(request: GenerationRequest): Promise<AIResponse> {
    try {
      this.validateConfig()
      this.initializeClient()

      if (!this.client) {
        throw new Error('Gemini client not initialized')
      }

      const model = this.client.getGenerativeModel({ 
        model: this.config.model || 'gemini-1.5-flash'
      })

      const prompt = request.systemPrompt 
        ? `${request.systemPrompt}\n\n${request.prompt}`
        : request.prompt

      const result = await model.generateContent(prompt)
      const response = await result.response
      const text = response.text()

      return {
        content: text,
        usage: {
          promptTokens: 0, // Gemini doesn't provide detailed token usage
          completionTokens: 0,
          totalTokens: 0
        }
      }
    } catch (error) {
      return this.handleError(error)
    }
  }
}

// Export factory function
export const createGeminiAPI = (apiKey: string, model?: string) => {
  return new GeminiAPI({
    provider: 'gemini',
    apiKey,
    model: model || 'gemini-1.5-flash',
    temperature: 0.7
  })
}