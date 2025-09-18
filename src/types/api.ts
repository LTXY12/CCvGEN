// AI API Types
export type AIProvider = 'gemini' | 'claude' | 'openai' | 'custom-openai' | 'ollama' | 'lm-studio'

export interface APIConfig {
  id?: string
  provider: AIProvider
  apiKey?: string
  endpoint?: string
  model?: string
  maxTokens?: number
  temperature?: number
}

export interface AIResponse {
  content: string
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
  error?: string
}

export interface GenerationRequest {
  prompt: string
  config: APIConfig
  systemPrompt?: string
}

// Character Generation Types
export interface CharacterInput {
  name: string
  age?: string
  gender?: string
  setting?: string
  characterType?: 'single' | 'multi' | 'professional'
  complexityLevel?: 'basic' | 'intermediate' | 'advanced'
  additionalDetails?: string
}

export interface AssetAnalysis {
  fileName: string
  category: 'profile' | 'emotion' | 'adult' | 'etc'
  mediaType: 'image' | 'audio' | 'video' | 'other'
  tags: string[]
  conditions?: string[]
  isNSFW: boolean
  confidence?: number
  aiGenerated?: boolean
}

export interface GeneratedSection {
  section: string
  content: string
  validated: boolean
}

export interface CharacterGenerationResult {
  characterData: Partial<import('./character-card').CharacterData>
  sections: GeneratedSection[]
  assets: AssetAnalysis[]
  customScripts: import('./character-card').CustomScript[]
  postHistoryInstructions: string
}