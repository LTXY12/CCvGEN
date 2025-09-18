import { BaseAIAPI } from './base-api'
import type { AIResponse, GenerationRequest } from '@/types/api'

export class OpenAIAPI extends BaseAIAPI {
  async generateText(request: GenerationRequest): Promise<AIResponse> {
    try {
      this.validateConfig()

      // Use direct fetch instead of OpenAI client for better browser compatibility
      const endpoint = this.config.endpoint || 'https://api.openai.com/v1/chat/completions'
      const apiKey = this.config.apiKey

      if (!apiKey) {
        throw new Error('API key is required')
      }

      const messages: any[] = []

      if (request.systemPrompt) {
        messages.push({
          role: 'system',
          content: request.systemPrompt
        })
      }

      messages.push({
        role: 'user',
        content: request.prompt
      })

      console.log(`Making direct API request to: ${endpoint}`)
      console.log('Request details:', {
        model: this.config.model || 'gpt-4o',
        maxTokens: this.config.maxTokens || 4000,
        temperature: this.config.temperature || 0.7,
        messageCount: messages.length
      })

      const requestBody = {
        model: this.config.model || 'gpt-4o',
        messages,
        max_tokens: this.config.maxTokens || 4000,
        temperature: this.config.temperature || 0.7,
        stream: false
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'User-Agent': 'RisuAI-CharacterGenerator/1.0'
        },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(60000) // 60 second timeout
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('API Response Error:', {
          status: response.status,
          statusText: response.statusText,
          errorText,
          headers: Object.fromEntries(response.headers.entries())
        })
        throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`)
      }

      const responseData = await response.json()
      console.log('API Response received successfully')

      const choice = responseData.choices?.[0]
      if (!choice?.message?.content) {
        throw new Error('No content in API response')
      }

      return {
        content: choice.message.content,
        usage: {
          promptTokens: responseData.usage?.prompt_tokens || 0,
          completionTokens: responseData.usage?.completion_tokens || 0,
          totalTokens: responseData.usage?.total_tokens || 0
        }
      }
    } catch (error: any) {
      console.error('OpenAI API detailed error:', {
        message: error.message,
        name: error.name,
        stack: error.stack,
        provider: this.config.provider,
        endpoint: this.config.endpoint,
        hasApiKey: !!this.config.apiKey
      })
      return this.handleError(error)
    }
  }
}

// Export factory functions
export const createOpenAIAPI = (apiKey: string, model?: string) => {
  return new OpenAIAPI({
    provider: 'openai',
    apiKey,
    model: model || 'gpt-4o',
    temperature: 0.7,
    maxTokens: 4000
  })
}

export const createCustomOpenAIAPI = (apiKey: string, endpoint: string, model?: string) => {
  return new OpenAIAPI({
    provider: 'custom-openai',
    apiKey,
    endpoint,
    model: model || 'gpt-4o',
    temperature: 0.7,
    maxTokens: 4000
  })
}