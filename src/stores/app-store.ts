import { create } from 'zustand'
import type { APIConfig, CharacterInput, CharacterGenerationResult } from '@/types/api'
import { localStorageManager, type PromptTemplate, type AppSettings } from '@/utils/local-storage'

interface AppState {
  // API Configuration
  apiConfigs: APIConfig[]
  selectedAPI: APIConfig | null
  
  // Character Generation
  characterInput: CharacterInput
  generationResult: CharacterGenerationResult | null
  isGenerating: boolean
  generationError: string | null
  
  // Prompt Management
  promptTemplates: PromptTemplate[]
  customPrompt: string
  isPromptEditMode: boolean
  
  // UI State
  settings: AppSettings
  
  // Actions
  setAPIConfigs: (configs: APIConfig[]) => void
  setSelectedAPI: (config: APIConfig | null) => void
  setCharacterInput: (input: Partial<CharacterInput>) => void
  setGenerationResult: (result: CharacterGenerationResult | null) => void
  setIsGenerating: (loading: boolean) => void
  setGenerationError: (error: string | null) => void
  
  // Prompt Actions
  setPromptTemplates: (templates: PromptTemplate[]) => void
  addPromptTemplate: (template: PromptTemplate) => void
  updatePromptTemplate: (template: PromptTemplate) => void
  deletePromptTemplate: (id: string) => void
  setCustomPrompt: (prompt: string) => void
  setIsPromptEditMode: (mode: boolean) => void
  
  // Settings Actions
  setSettings: (settings: Partial<AppSettings>) => void
  
  // Storage Actions
  loadFromStorage: () => void
  saveToStorage: () => void
  exportData: () => string
  importData: (data: string) => boolean
  resetGeneration: () => void
}

export const useAppStore = create<AppState>((set, get) => ({
  // Initial state (will be loaded from storage)
  apiConfigs: [],
  selectedAPI: null,
  characterInput: {
    name: '',
    age: '',
    gender: '',
    setting: '',
    characterType: 'single',
    complexityLevel: 'intermediate',
    additionalDetails: ''
  },
  generationResult: null,
  isGenerating: false,
  generationError: null,
  
  // Prompt Management
  promptTemplates: [],
  customPrompt: '',
  isPromptEditMode: false,
  
  // UI State
  settings: {
    theme: 'light',
    language: 'ko',
    autoSave: true,
    enablePromptEditing: true
  },
  
  // Basic Actions
  setAPIConfigs: (configs) => {
    set({ apiConfigs: configs })
    localStorageManager.saveAPIConfigs(configs)
  },
  
  setSelectedAPI: (config) => {
    set({ selectedAPI: config })
    localStorageManager.saveSelectedAPI(config)
  },
  
  setCharacterInput: (input) => {
    set((state) => {
      const newInput = { ...state.characterInput, ...input }
      if (state.settings.autoSave) {
        localStorageManager.saveCharacterInput(newInput)
      }
      return { characterInput: newInput }
    })
  },
  
  setGenerationResult: (result) => set({ generationResult: result }),
  
  setIsGenerating: (loading) => set({ isGenerating: loading }),
  
  setGenerationError: (error) => set({ generationError: error }),
  
  
  // Prompt Actions
  setPromptTemplates: (templates) => {
    set({ promptTemplates: templates })
    localStorageManager.savePromptTemplates(templates)
  },
  
  addPromptTemplate: (template) => {
    set((state) => {
      const newTemplates = [...state.promptTemplates, template]
      localStorageManager.savePromptTemplates(newTemplates)
      return { promptTemplates: newTemplates }
    })
  },
  
  updatePromptTemplate: (template) => {
    set((state) => {
      const index = state.promptTemplates.findIndex(t => t.id === template.id)
      if (index >= 0) {
        const newTemplates = [...state.promptTemplates]
        newTemplates[index] = { ...template, updatedAt: new Date().toISOString() }
        localStorageManager.savePromptTemplates(newTemplates)
        return { promptTemplates: newTemplates }
      }
      return state
    })
  },
  
  deletePromptTemplate: (id) => {
    set((state) => {
      const newTemplates = state.promptTemplates.filter(t => t.id !== id)
      localStorageManager.savePromptTemplates(newTemplates)
      return { promptTemplates: newTemplates }
    })
  },
  
  setCustomPrompt: (prompt) => {
    set({ customPrompt: prompt })
    localStorageManager.saveCustomPrompt(prompt)
  },
  
  setIsPromptEditMode: (mode) => set({ isPromptEditMode: mode }),
  
  // Settings Actions
  setSettings: (newSettings) => {
    set((state) => {
      const settings = { ...state.settings, ...newSettings }
      localStorageManager.saveSettings(settings)
      
      // Apply theme to document
      if (newSettings.theme) {
        document.documentElement.setAttribute('data-theme', newSettings.theme)
      }
      
      return { settings }
    })
  },
  
  // Storage Actions
  loadFromStorage: () => {
    const apiConfigs = localStorageManager.loadAPIConfigs()
    const selectedAPI = localStorageManager.loadSelectedAPI()
    const characterInput = localStorageManager.loadCharacterInput()
    const promptTemplates = localStorageManager.loadPromptTemplates()
    const customPrompt = localStorageManager.loadCustomPrompt()
    const settings = localStorageManager.loadSettings()
    
    set({
      apiConfigs,
      selectedAPI,
      characterInput,
      promptTemplates,
      customPrompt,
      settings
    })
    
    // Apply loaded theme
    document.documentElement.setAttribute('data-theme', settings.theme)
  },
  
  saveToStorage: () => {
    const state = get()
    localStorageManager.saveAPIConfigs(state.apiConfigs)
    localStorageManager.saveSelectedAPI(state.selectedAPI)
    localStorageManager.saveCharacterInput(state.characterInput)
    localStorageManager.savePromptTemplates(state.promptTemplates)
    localStorageManager.saveCustomPrompt(state.customPrompt)
    localStorageManager.saveSettings(state.settings)
  },
  
  exportData: () => {
    return localStorageManager.exportData()
  },
  
  importData: (data) => {
    const success = localStorageManager.importData(data)
    if (success) {
      get().loadFromStorage()
    }
    return success
  },
  
  resetGeneration: () => set({
    generationResult: null,
    isGenerating: false,
    generationError: null
  })
}))

// Selectors
export const useAPIConfig = () => {
  const { apiConfigs, selectedAPI, setAPIConfigs, setSelectedAPI } = useAppStore()
  return { apiConfigs, selectedAPI, setAPIConfigs, setSelectedAPI }
}

export const useCharacterGeneration = () => {
  const {
    characterInput,
    generationResult,
    isGenerating,
    generationError,
    setCharacterInput,
    setGenerationResult,
    setIsGenerating,
    setGenerationError,
    resetGeneration
  } = useAppStore()
  
  return {
    characterInput,
    generationResult,
    isGenerating,
    generationError,
    setCharacterInput,
    setGenerationResult,
    setIsGenerating,
    setGenerationError,
    resetGeneration
  }
}

export const usePromptManagement = () => {
  const {
    promptTemplates,
    customPrompt,
    isPromptEditMode,
    setPromptTemplates,
    addPromptTemplate,
    updatePromptTemplate,
    deletePromptTemplate,
    setCustomPrompt,
    setIsPromptEditMode
  } = useAppStore()
  
  return {
    promptTemplates,
    customPrompt,
    isPromptEditMode,
    setPromptTemplates,
    addPromptTemplate,
    updatePromptTemplate,
    deletePromptTemplate,
    setCustomPrompt,
    setIsPromptEditMode
  }
}

export const useAppSettings = () => {
  const {
    settings,
    setSettings,
    loadFromStorage,
    saveToStorage,
    exportData,
    importData
  } = useAppStore()
  
  return {
    settings,
    setSettings,
    loadFromStorage,
    saveToStorage,
    exportData,
    importData
  }
}

export const useUIState = () => {
  const {
    settings
  } = useAppStore()
  
  return {
    theme: settings.theme,
    language: settings.language
  }
}

export const useCharacterInput = () => {
  const { characterInput } = useAppStore()
  return characterInput
}