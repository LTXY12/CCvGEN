import type { APIConfig } from '@/types/api'

// Local Storage Keys
const STORAGE_KEYS = {
  API_CONFIGS: 'ccvgen_api_configs',
  SELECTED_API: 'ccvgen_selected_api',
  PROMPT_TEMPLATES: 'ccvgen_prompt_templates',
  CUSTOM_PROMPT: 'ccvgen_custom_prompt',
  CHARACTER_INPUT: 'ccvgen_character_input',
  SETTINGS: 'ccvgen_settings'
} as const

// Prompt Template Interface
export interface PromptTemplate {
  id: string
  name: string
  description: string
  content: string
  createdAt: string
  updatedAt: string
  category: 'system' | 'character' | 'asset' | 'custom'
  tags: string[]
}

// Settings Interface
export interface AppSettings {
  theme: 'light' | 'dark'
  language: 'ko' | 'en' | 'ja'
  autoSave: boolean
  enablePromptEditing: boolean
}

class LocalStorageManager {
  // Generic storage methods
  private setItem<T>(key: string, value: T): void {
    try {
      const serialized = JSON.stringify(value)
      localStorage.setItem(key, serialized)
    } catch (error) {
      console.error(`Failed to save to localStorage (${key}):`, error)
    }
  }

  private getItem<T>(key: string, defaultValue: T): T {
    try {
      const item = localStorage.getItem(key)
      return item ? JSON.parse(item) : defaultValue
    } catch (error) {
      console.error(`Failed to read from localStorage (${key}):`, error)
      return defaultValue
    }
  }

  private removeItem(key: string): void {
    try {
      localStorage.removeItem(key)
    } catch (error) {
      console.error(`Failed to remove from localStorage (${key}):`, error)
    }
  }

  // API Configuration methods
  saveAPIConfigs(configs: APIConfig[]): void {
    this.setItem(STORAGE_KEYS.API_CONFIGS, configs)
  }

  loadAPIConfigs(): APIConfig[] {
    return this.getItem<APIConfig[]>(STORAGE_KEYS.API_CONFIGS, [])
  }

  saveSelectedAPI(config: APIConfig | null): void {
    this.setItem(STORAGE_KEYS.SELECTED_API, config)
  }

  loadSelectedAPI(): APIConfig | null {
    return this.getItem<APIConfig | null>(STORAGE_KEYS.SELECTED_API, null)
  }

  // Prompt Template methods
  savePromptTemplates(templates: PromptTemplate[]): void {
    this.setItem(STORAGE_KEYS.PROMPT_TEMPLATES, templates)
  }

  loadPromptTemplates(): PromptTemplate[] {
    return this.getItem<PromptTemplate[]>(STORAGE_KEYS.PROMPT_TEMPLATES, [])
  }

  savePromptTemplate(template: PromptTemplate): void {
    const templates = this.loadPromptTemplates()
    const existingIndex = templates.findIndex(t => t.id === template.id)
    
    if (existingIndex >= 0) {
      templates[existingIndex] = { ...template, updatedAt: new Date().toISOString() }
    } else {
      templates.push({ ...template, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
    }
    
    this.savePromptTemplates(templates)
  }

  deletePromptTemplate(id: string): void {
    const templates = this.loadPromptTemplates()
    const filtered = templates.filter(t => t.id !== id)
    this.savePromptTemplates(filtered)
  }

  // Custom Prompt methods
  saveCustomPrompt(prompt: string): void {
    this.setItem(STORAGE_KEYS.CUSTOM_PROMPT, prompt)
  }

  loadCustomPrompt(): string {
    return this.getItem<string>(STORAGE_KEYS.CUSTOM_PROMPT, '')
  }

  // Character Input methods
  saveCharacterInput(input: any): void {
    this.setItem(STORAGE_KEYS.CHARACTER_INPUT, input)
  }

  loadCharacterInput(): any {
    return this.getItem(STORAGE_KEYS.CHARACTER_INPUT, {
      name: '',
      age: '',
      gender: '',
      setting: '',
      characterType: 'single',
      complexityLevel: 'intermediate',
      additionalDetails: ''
    })
  }

  // Settings methods
  saveSettings(settings: AppSettings): void {
    this.setItem(STORAGE_KEYS.SETTINGS, settings)
  }

  loadSettings(): AppSettings {
    return this.getItem<AppSettings>(STORAGE_KEYS.SETTINGS, {
      theme: 'light',
      language: 'ko',
      autoSave: true,
      enablePromptEditing: true
    })
  }

  // Export/Import methods
  exportData(): string {
    const data = {
      apiConfigs: this.loadAPIConfigs(),
      promptTemplates: this.loadPromptTemplates(),
      customPrompt: this.loadCustomPrompt(),
      settings: this.loadSettings(),
      exportedAt: new Date().toISOString(),
      version: '1.0'
    }
    return JSON.stringify(data, null, 2)
  }

  importData(jsonData: string): boolean {
    try {
      const data = JSON.parse(jsonData)
      
      if (data.apiConfigs) {
        this.saveAPIConfigs(data.apiConfigs)
      }
      
      if (data.promptTemplates) {
        this.savePromptTemplates(data.promptTemplates)
      }
      
      if (data.customPrompt) {
        this.saveCustomPrompt(data.customPrompt)
      }
      
      if (data.settings) {
        this.saveSettings(data.settings)
      }
      
      return true
    } catch (error) {
      console.error('Failed to import data:', error)
      return false
    }
  }

  // Clear all data
  clearAllData(): void {
    Object.values(STORAGE_KEYS).forEach(key => {
      this.removeItem(key)
    })
  }

  // Get storage usage info
  getStorageInfo(): { used: number; available: number; percentage: number } {
    let used = 0
    Object.values(STORAGE_KEYS).forEach(key => {
      const item = localStorage.getItem(key)
      if (item) {
        used += item.length
      }
    })

    // Estimate 5MB limit for localStorage
    const available = 5 * 1024 * 1024
    const percentage = (used / available) * 100

    return { used, available, percentage }
  }
}

export const localStorageManager = new LocalStorageManager()