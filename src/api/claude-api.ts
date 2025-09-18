import Anthropic from '@anthropic-ai/sdk'
import { BaseAIAPI } from './base-api'
import type { AIResponse, GenerationRequest } from '@/types/api'

export class ClaudeAPI extends BaseAIAPI {
  private client: Anthropic | null = null

  private initializeClient(): void {
    if (!this.client && this.config.apiKey) {
      this.client = new Anthropic({
        apiKey: this.config.apiKey,
        dangerouslyAllowBrowser: true // For client-side usage
      })
    }
  }

  async generateText(request: GenerationRequest): Promise<AIResponse> {
    try {
      this.validateConfig()
      this.initializeClient()

      if (!this.client) {
        throw new Error('Claude client not initialized')
      }

      const messages: Anthropic.Messages.MessageParam[] = [
        {
          role: 'user',
          content: request.prompt
        }
      ]

      const response = await this.client.messages.create({
        model: this.config.model || 'claude-3-5-sonnet-20241022',
        max_tokens: this.config.maxTokens || 4000,
        temperature: this.config.temperature || 0.7,
        system: request.systemPrompt,
        messages
      })

      const content = response.content[0]
      if (content.type !== 'text') {
        throw new Error('Unexpected response type from Claude API')
      }

      return {
        content: content.text,
        usage: {
          promptTokens: response.usage.input_tokens,
          completionTokens: response.usage.output_tokens,
          totalTokens: response.usage.input_tokens + response.usage.output_tokens
        }
      }
    } catch (error) {
      return this.handleError(error)
    }
  }
}

// Export factory function
export const createClaudeAPI = (apiKey: string, model?: string) => {
  return new ClaudeAPI({
    provider: 'claude',
    apiKey,
    model: model || 'claude-3-5-sonnet-20241022',
    temperature: 0.7,
    maxTokens: 4000
  })
}