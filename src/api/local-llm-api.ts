import { BaseAIAPI } from './base-api'
import type { AIResponse, GenerationRequest } from '@/types/api'

export class LocalLLMAPI extends BaseAIAPI {
  private getEndpoint(): string {
    if (this.config.endpoint) {
      return this.config.endpoint
    }

    // Default endpoints
    if (this.config.provider === 'ollama') {
      return 'http://localhost:11434/api/generate'
    } else if (this.config.provider === 'lm-studio') {
      return 'http://localhost:1234/v1/chat/completions'
    }

    throw new Error('No endpoint configured for local LLM')
  }

  async generateText(request: GenerationRequest): Promise<AIResponse> {
    try {
      const endpoint = this.getEndpoint()

      if (this.config.provider === 'ollama') {
        return this.generateWithOllama(request, endpoint)
      } else if (this.config.provider === 'lm-studio') {
        return this.generateWithLMStudio(request, endpoint)
      }

      throw new Error(`Unsupported local LLM provider: ${this.config.provider}`)
    } catch (error) {
      return this.handleError(error)
    }
  }

  private async generateWithOllama(request: GenerationRequest, endpoint: string): Promise<AIResponse> {
    const prompt = request.systemPrompt 
      ? `${request.systemPrompt}\n\n${request.prompt}`
      : request.prompt

    const body = {
      model: this.config.model || 'llama3.2',
      prompt,
      stream: false,
      options: {
        temperature: this.config.temperature || 0.7,
        num_predict: this.config.maxTokens || 4000
      }
    }

    const response = await this.makeRequest(endpoint, body)
    const data = await response.json()

    return {
      content: data.response || '',
      usage: {
        promptTokens: data.prompt_eval_count || 0,
        completionTokens: data.eval_count || 0,
        totalTokens: (data.prompt_eval_count || 0) + (data.eval_count || 0)
      }
    }
  }

  private async generateWithLMStudio(request: GenerationRequest, endpoint: string): Promise<AIResponse> {
    const messages: Array<{ role: string; content: string }> = []

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

    const body = {
      model: this.config.model || 'local-model',
      messages,
      max_tokens: this.config.maxTokens || 4000,
      temperature: this.config.temperature || 0.7,
      stop: null
    }

    const response = await this.makeRequest(endpoint, body)
    const data = await response.json()

    const choice = data.choices?.[0]
    if (!choice?.message?.content) {
      throw new Error('No content in LM Studio response')
    }

    return {
      content: choice.message.content,
      usage: {
        promptTokens: data.usage?.prompt_tokens || 0,
        completionTokens: data.usage?.completion_tokens || 0,
        totalTokens: data.usage?.total_tokens || 0
      }
    }
  }
}

// Export factory functions
export const createOllamaAPI = (model?: string, endpoint?: string) => {
  return new LocalLLMAPI({
    provider: 'ollama',
    model: model || 'llama3.2',
    endpoint: endpoint || 'http://localhost:11434/api/generate',
    temperature: 0.7,
    maxTokens: 4000
  })
}

export const createLMStudioAPI = (model?: string, endpoint?: string) => {
  return new LocalLLMAPI({
    provider: 'lm-studio',
    model: model || 'local-model',
    endpoint: endpoint || 'http://localhost:1234/v1/chat/completions',
    temperature: 0.7,
    maxTokens: 4000
  })
}