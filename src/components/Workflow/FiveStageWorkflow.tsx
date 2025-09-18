/**
 * Five-Stage Workflow UI Component
 * RISU Dynamic Asset System with AI-powered filename processing
 */

import React, { useState, useCallback, useRef } from 'react'
import { FiveStageWorkflow, type WorkflowConfig, type ModificationRequest } from '@/core/five-stage-workflow'
import { useAPIConfig } from '@/stores/app-store'
import { APISetup } from '@/components/Steps/APISetup'
import type { CharacterInput } from '@/types/api'
import type { AssetRenameResult } from '@/utils/dynamic-asset-renamer'
import { logger } from '@/utils/logger'
import { invoke } from '@tauri-apps/api/core'

interface FiveStageWorkflowProps {
  characterInput: CharacterInput
  onComplete?: (result: any) => void
  onCharacterInputChange?: (input: CharacterInput) => void
}

export const FiveStageWorkflowComponent: React.FC<FiveStageWorkflowProps> = ({
  characterInput,
  onCharacterInputChange
}) => {
  const { selectedAPI } = useAPIConfig()
  const [activeStep, setActiveStep] = useState(0)
  const [workflow, setWorkflow] = useState<FiveStageWorkflow | null>(null)
  const [loading, setLoading] = useState(false)
  const [assets, setAssets] = useState<File[]>([])
  const [categorizedAssets, setCategorizedAssets] = useState<{
    profile: File[]
    emotion: File[]
    adult: File[]
    etc: File[]
  }>({
    profile: [],
    emotion: [],
    adult: [],
    etc: []
  })
  const [assetResults, setAssetResults] = useState<AssetRenameResult[]>([])
  const [showModificationDialog, setShowModificationDialog] = useState(false)
  const [selectedField, setSelectedField] = useState<{ field: string; value: string }>({ field: '', value: '' })
  const [modificationRequest, setModificationRequest] = useState('')
  const [modificationReason, setModificationReason] = useState('')
  
  // Enhanced modification options
  const [editMode, setEditMode] = useState<'ai' | 'manual'>('manual') // Default to manual
  const [customModificationPrompt, setCustomModificationPrompt] = useState('')
  const [showFullContent, setShowFullContent] = useState(false)
  const [showLorebookEditor, setShowLorebookEditor] = useState(false)
  const [editingLorebookIndex, setEditingLorebookIndex] = useState<number>(-1)
  const [editingLorebookData, setEditingLorebookData] = useState<any>(null)
  const [lorebookEditMode, setLorebookEditMode] = useState<'manual' | 'ai'>('manual')
  const [lorebookModificationRequest, setLorebookModificationRequest] = useState('')
  const [lorebookModificationReason, setLorebookModificationReason] = useState('')
  const [localCharacterInput, setLocalCharacterInput] = useState<CharacterInput>(characterInput)
  const [lorebookRequirements, setLorebookRequirements] = useState('')
  const [showPromptEditor, setShowPromptEditor] = useState(false)
  const [customCharacterPrompt, setCustomCharacterPrompt] = useState('')
  const [customLorebookPrompt, setCustomLorebookPrompt] = useState('')
  const [useCustomPrompts, setUseCustomPrompts] = useState(false)
  const [debugLog, setDebugLog] = useState<string[]>([])
  const [showDebugPanel, setShowDebugPanel] = useState(false)
  const [showCompletionModal, setShowCompletionModal] = useState(false)
  const [completionMessage, setCompletionMessage] = useState('')
  
  // Character data state
  const [characterData, setCharacterData] = useState<any>(null)
  const [lorebook, setLorebook] = useState<any[]>([])
  const [showSettings, setShowSettings] = useState(false)
  
  // Output format options
  const [characterOutputFormat, setCharacterOutputFormat] = useState<'narrative' | 'sheet' | 'narrative_sheet'>('narrative')
  const [lorebookOutputFormat, setLorebookOutputFormat] = useState<'narrative' | 'sheet' | 'narrative_sheet'>('narrative')
  const [outputDetailLevel, setOutputDetailLevel] = useState<'simple' | 'normal' | 'detailed'>('normal')
  const [fileNames, setFileNames] = useState<{
    profile: Record<string, string>
    emotion: Record<string, string>
    adult: Record<string, string>
    etc: Record<string, string>
  }>({
    profile: {},
    emotion: {},
    adult: {},
    etc: {}
  })
  const [bulkRenameSettings, setBulkRenameSettings] = useState<{
    profile: { prefix: string; suffix: string; removeExtension: boolean }
    emotion: { prefix: string; suffix: string; removeExtension: boolean }
    adult: { prefix: string; suffix: string; removeExtension: boolean }
    etc: { prefix: string; suffix: string; removeExtension: boolean }
  }>({
    profile: { prefix: '', suffix: '', removeExtension: false },
    emotion: { prefix: '', suffix: '', removeExtension: false },
    adult: { prefix: '', suffix: '', removeExtension: false },
    etc: { prefix: '', suffix: '', removeExtension: false }
  })
  const fileInputRefs = useRef<{
    profile: HTMLInputElement | null
    emotion: HTMLInputElement | null
    adult: HTMLInputElement | null
    etc: HTMLInputElement | null
  }>({
    profile: null,
    emotion: null,
    adult: null,
    etc: null
  })

  // Handle character input change
  const handleCharacterInputChange = (newInput: Partial<CharacterInput>) => {
    const updatedInput = { ...localCharacterInput, ...newInput }
    setLocalCharacterInput(updatedInput)
    onCharacterInputChange?.(updatedInput)
  }

  // Generate character prompt based on output format
  const generateCharacterPrompt = () => {
    const detailLevel = outputDetailLevel === 'simple' ? '간단하고 핵심적인' : 
                      outputDetailLevel === 'detailed' ? '매우 상세하고 구체적인' : '적절한 수준의'
    
    const basePrompt = `당신은 전문적인 캐릭터 생성자입니다. 다음 캐릭터 설정을 바탕으로 ${detailLevel} 캐릭터 정보를 생성해주세요.

캐릭터 설정:
${localCharacterInput.additionalDetails}

**RISU 규격 중요사항**: personality와 scenario 필드는 비권장입니다. 모든 정보를 description에 통합하여 작성해주세요.

반드시 다음 JSON 형식으로 응답해주세요 (JSON 내부에서 줄바꿈이나 특수문자는 이스케이프 처리 필요):
{
  "name": "캐릭터 이름",
  "description": "캐릭터의 종합적인 설명 (아래 형식 지침 따름)",
  "first_mes": "캐릭터의 말투와 성격이 드러나는 자연스러운 첫 메시지",
  "mes_example": "캐릭터의 대화 스타일을 보여주는 예시 대화"
}

**중요한 JSON 작성 규칙:**
- JSON 문자열 내부에서는 실제 줄바꿈 사용 금지 (대신 공백이나 문장 구분 사용)
- 따옴표는 \\" 로 이스케이프 처리
- 올바른 JSON 형식 유지
- 대화 예시에서 따옴표가 많이 사용되는 경우 특히 주의

`

    switch (characterOutputFormat) {
      case 'narrative':
        return basePrompt + `**내용 작성 형식 지침:**
- description: 캐릭터에 대한 자연스러운 문장형 설명 (외모, 나이, 성별, 직업, 성격, 배경, 현재 상황, 특징을 자연스럽게 연결된 문장들로 서술)`

      case 'sheet':
        return basePrompt + `**내용 작성 형식 지침:**
- description: 모든 캐릭터 정보를 구조화된 시트 형식으로 작성 (예: "• 이름: [이름]\\n• 나이: [나이]\\n• 성별: [성별]\\n• 외모: [외모 설명]\\n• 성격: [성격 특성들]\\n• 배경: [배경 설정]\\n• 현재 상황: [현재 상황]\\n• 특징: [특별한 특징들]")`

      case 'narrative_sheet':
        return basePrompt + `**내용 작성 형식 지침:**
- description: 문장형 서술과 구조화된 정보를 모두 포함 (예: "[캐릭터에 대한 자연스러운 문장형 설명]\\n\\n[구조화된 세부 정보]\\n• 이름: [이름]\\n• 나이: [나이]\\n• 성별: [성별]\\n• 외모: [외모]\\n• 성격: [성격]\\n• 배경: [배경]\\n• 현재 상황: [상황]\\n• 특징: [특징]")`

      default:
        return basePrompt
    }
  }

  // Generate lorebook prompt based on output format  
  const generateLorebookPrompt = (characterData: any) => {
    const detailLevel = outputDetailLevel === 'simple' ? '간단하고 핵심적인' : 
                      outputDetailLevel === 'detailed' ? '매우 상세하고 구체적인' : '적절한 수준의'
    
    const basePrompt = `당신은 세계관 설정 전문가입니다. 다음 캐릭터에 특화된 ${detailLevel} 로어북을 생성해주세요.

캐릭터 정보:
- 이름: ${characterData?.name || ''}
- 캐릭터 설명: ${characterData?.description || ''}

사용자 요구사항: ${lorebookRequirements}

반드시 다음 JSON 형식으로 응답해주세요 (JSON 내부에서 줄바꿈이나 특수문자는 이스케이프 처리 필요):
{
  "lorebook": [
    {
      "key": "로어북 키워드",
      "content": "내용 (아래 형식 지침 따름, JSON 문자열 내부에서는 줄바꿈 대신 공백 사용)",
      "category": "세계관|지역|인물|문화|특별설정",
      "priority": 5,
      "enabled": true
    }
  ]
}

**중요한 JSON 작성 규칙:**
- JSON 문자열 내부에서는 실제 줄바꿈 사용 금지
- 불필요한 따옴표나 특수문자 피하기
- 올바른 JSON 형식 유지

`

    switch (lorebookOutputFormat) {
      case 'narrative':
        return basePrompt + `**내용 작성 형식 지침:**
- content: 해당 키워드에 대한 자연스러운 문장형 설명 (스토리텔링 방식으로 서술)`

      case 'sheet':
        return basePrompt + `**내용 작성 형식 지침:**
- content: 구조화된 시트 형식으로 작성 (예: "• 개요: [간단한 설명]\\n• 세부사항: [구체적 정보]\\n• 특징: [주요 특징들]\\n• 관련사항: [연관 정보]")`

      case 'narrative_sheet':
        return basePrompt + `**내용 작성 형식 지침:**
- content: 문장형 서술과 구조화된 정보를 모두 포함 (예: "[자연스러운 문장형 설명]\\n\\n[구조화된 정보]\\n• 개요: [개요]\\n• 세부사항: [세부사항]\\n• 특징: [특징]\\n• 관련사항: [관련사항]")`

      default:
        return basePrompt
    }
  }

  // Initialize workflow
  const initializeWorkflow = useCallback(() => {
    if (!selectedAPI) {
      return
    }
    
    const config: WorkflowConfig = {
      apiConfig: selectedAPI,
      characterInput: localCharacterInput
    }
    const newWorkflow = new FiveStageWorkflow(config)
    setWorkflow(newWorkflow)
  }, [selectedAPI, localCharacterInput])

  // Test API connection directly without fallbacks
  const testAPIConnection = async () => {
    if (!selectedAPI) {
      alert('API 설정이 필요합니다.')
      return
    }

    try {
      console.log('=== DIRECT API TEST (No Fallbacks) ===')
      console.log('Selected API:', JSON.stringify(selectedAPI, null, 2))
      
      
      // Test API directly without any fallback logic for other providers
      const { APIFactory } = await import('@/api/api-factory')
      
      // Validate config first
      const isValid = APIFactory.validateConfig(selectedAPI)
      console.log('API config validation:', isValid)
      
      if (!isValid) {
        alert('API 설정이 유효하지 않습니다. API 키나 엔드포인트를 확인해주세요.')
        return false
      }
      
      const api = APIFactory.createAPI(selectedAPI)
      console.log('API instance created:', api)
      
      const testRequest = {
        prompt: 'Hello, please respond with just "OK".',
        config: selectedAPI,
        systemPrompt: 'You are a helpful assistant. Respond concisely.'
      }
      
      console.log('Sending test request:', testRequest)
      
      const response = await api.generateText(testRequest)
      console.log('Raw API response:', response)
      
      if (response.error) {
        addDebugLog(`❌ API 오류 응답: ${response.error}`)
        alert(`❌ API 연결 실패: ${response.error}`)
        return false
      }
      
      if (!response.content) {
        addDebugLog('❌ API 응답 내용이 비어있음')
        alert('❌ API 응답이 비어있습니다.')
        return false
      }
      
      addDebugLog(`✅ API 연결 성공! 응답 길이: ${response.content.length}자`)
      alert(`✅ API 연결 성공!\n응답: ${response.content.substring(0, 100)}`)
      return true
    } catch (error) {
      addDebugLog(`❌ API 테스트 예외 발생: ${error instanceof Error ? error.message : String(error)}`)
      console.error('Direct API test error:', error)
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
      
      alert(`❌ API 테스트 중 오류: ${error instanceof Error ? error.message : String(error)}`)
      return false
    }
  }

  // Execute workflow stages - Use direct API approach like existing workflow
  const executeStage = async (stageNumber: number) => {
    if (!selectedAPI) {
      alert('API 설정이 필요합니다. 먼저 API를 설정해주세요.')
      return
    }

    setLoading(true)
    try {
      // Create a fresh workflow instance for each execution with current API
      const config: WorkflowConfig = {
        apiConfig: selectedAPI,
        characterInput: localCharacterInput
      }
      const freshWorkflow = new FiveStageWorkflow(config)
      
      if (stageNumber === 1) {
        // Execute only Stage 1
        const customPrompt = useCustomPrompts && customCharacterPrompt ? customCharacterPrompt : generateCharacterPrompt()
        await freshWorkflow.executeStage1(customPrompt)
        // Update local workflow instance
        setWorkflow(freshWorkflow)
        // Update character data in component state
        setCharacterData(freshWorkflow.getCharacterData())
        setActiveStep(1) // Move to stage 2 (lorebook)
      } else if (stageNumber === 2) {
        // Make sure we have workflow with Stage 1 completed
        if (!workflow) {
          alert('먼저 1단계를 완료해주세요.')
          return
        }
        
        logger.info('Starting Stage 2 (Lorebook Generation)', {
          workflowExists: !!workflow,
          requirements: lorebookRequirements,
          useCustomPrompts,
          hasCustomPrompt: !!customLorebookPrompt
        })
        
        const customPrompt = useCustomPrompts && customLorebookPrompt ? customLorebookPrompt : generateLorebookPrompt(workflow.getCharacterData())
        logger.debug('Generated prompt for Stage 2', { promptLength: customPrompt.length })
        
        await workflow.executeStage2(lorebookRequirements, customPrompt)
        // Update lorebook data in component state
        setLorebook(workflow.getLorebook())
        setActiveStep(2) // Move to asset processing stage
      } else if (stageNumber === 3 && assets.length > 0) {
        if (!workflow) {
          alert('먼저 이전 단계들을 완료해주세요.')
          return
        }
        console.log('Executing Stage 3 with fileNames:', fileNames)
        await workflow.executeStage3(assets, fileNames)
        const results = workflow.getAssetResults()
        setAssetResults(results)
        // Update character data after asset integration
        setCharacterData(workflow.getCharacterData())
        setActiveStep(3) // Move to modification stage
      } else {
        setActiveStep(stageNumber)
      }
    } catch (error) {
      logger.error('Workflow execution failed', {
        stageNumber,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        apiConfig: selectedAPI,
        characterInput: localCharacterInput
      })
      
      // More detailed error message based on stage
      let errorMessage = `단계 ${stageNumber} 실행 중 오류가 발생했습니다.`
      
      if (error instanceof Error) {
        if (error.message.includes('API Error')) {
          errorMessage += `\n\nAPI 오류: ${error.message}\n\n해결 방법:\n1. API 키가 올바른지 확인\n2. API 엔드포인트가 정상인지 확인\n3. 네트워크 연결 상태 확인`
        } else if (error.message.includes('No content received')) {
          errorMessage += `\n\nAPI 응답이 비어있습니다.\n\n해결 방법:\n1. 다른 AI 모델 시도\n2. 프롬프트 내용 단순화\n3. API 설정 확인`
        } else if (error.message.includes('JSON')) {
          errorMessage += `\n\nAI 응답 파싱 오류: ${error.message}\n\n해결 방법:\n1. 다시 시도\n2. 다른 AI 모델 사용\n3. 커스텀 프롬프트 수정`
        } else {
          errorMessage += `\n\n상세 오류: ${error.message}`
        }
      }
      
      alert(errorMessage)
    } finally {
      addDebugLog(`🔄 단계 ${stageNumber} 실행 종료, 로딩 상태 해제`)
      setLoading(false)
    }
  }

  // Navigation functions
  const goToNextStage = () => {
    const nextStep = activeStep + 1
    if (nextStep <= 4) {
      // Update character data and lorebook from workflow when moving to modification stage
      if (nextStep === 3 && workflow) {
        setCharacterData(workflow.getCharacterData())
        setLorebook(workflow.getLorebook())
      }
      setActiveStep(nextStep)
    }
  }

  const goToPreviousStage = () => {
    const prevStep = activeStep - 1
    if (prevStep >= 0) {
      setActiveStep(prevStep)
    }
  }

  // Handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files) {
      setAssets(prev => [...prev, ...Array.from(files)])
    }
  }

  // Handle categorized file upload
  const handleCategorizedFileUpload = (category: 'profile' | 'emotion' | 'adult' | 'etc') => (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files) {
      const fileArray = Array.from(files)
      setCategorizedAssets(prev => ({
        ...prev,
        [category]: [...prev[category], ...fileArray]
      }))
      // Also add to main assets array for backward compatibility
      setAssets(prev => [...prev, ...fileArray])
      
      // Store original file names (not modified, just for reference)
      setFileNames(prev => ({
        ...prev,
        [category]: {
          ...prev[category],
          ...fileArray.reduce((acc, file) => {
            // Keep original filename as the editable value
            acc[file.name] = file.name
            return acc
          }, {} as Record<string, string>)
        }
      }))
    }
  }

  // Remove categorized file
  const removeCategorizedFile = (category: 'profile' | 'emotion' | 'adult' | 'etc', index: number) => {
    const fileToRemove = categorizedAssets[category][index]
    setCategorizedAssets(prev => ({
      ...prev,
      [category]: prev[category].filter((_, i) => i !== index)
    }))
    // Also remove from main assets array
    setAssets(prev => prev.filter(file => file !== fileToRemove))
    // Remove from fileNames
    setFileNames(prev => ({
      ...prev,
      [category]: Object.fromEntries(
        Object.entries(prev[category]).filter(([fileName]) => fileName !== fileToRemove.name)
      )
    }))
  }

  // Update individual file name
  const updateFileName = (category: 'profile' | 'emotion' | 'adult' | 'etc', originalName: string, newName: string) => {
    setFileNames(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [originalName]: newName
      }
    }))
  }

  // Apply bulk rename settings to a category
  const applyBulkRename = (category: 'profile' | 'emotion' | 'adult' | 'etc') => {
    const settings = bulkRenameSettings[category]
    const files = categorizedAssets[category]
    
    setFileNames(prev => ({
      ...prev,
      [category]: files.reduce((acc, file, index) => {
        let newName = file.name
        
        // Remove extension if requested (removes .xxx where xxx can be any characters/numbers)
        if (settings.removeExtension) {
          newName = newName.replace(/\.[^.]*$/, '')
        }
        
        // Add prefix
        if (settings.prefix) {
          newName = settings.prefix + newName
        }
        
        // Add suffix
        if (settings.suffix) {
          // If suffix contains {i}, replace with index number
          const processedSuffix = settings.suffix.replace(/\{i\}/g, (index + 1).toString())
          newName = newName + processedSuffix
        }
        
        // Debug logging for bulk rename
        console.log(`Bulk rename - Original: ${file.name}, After processing: ${newName}`)
        
        // Ensure we don't have empty filenames
        if (!newName || newName.trim() === '') {
          console.warn(`Empty filename generated for ${file.name}, using original name without extension`)
          newName = file.name.replace(/\.[^.]*$/, '') || file.name
        }
        
        console.log(`Final filename mapping: ${file.name} -> ${newName}`)
        
        acc[file.name] = newName
        return acc
      }, {} as Record<string, string>)
    }))
  }

  // Handle modification request (AI mode)
  const handleModificationRequest = async () => {
    if (!workflow || !modificationRequest) return
    
    setLoading(true)
    try {
      const request: ModificationRequest = {
        stage: 4,
        field: selectedField.field,
        currentValue: selectedField.value,
        requestedChange: modificationRequest,
        reason: modificationReason
      }
      
      // Use custom prompt if provided, otherwise use default
      const customPrompt = customModificationPrompt.trim() || undefined
      await workflow.handleModificationRequest(request, customPrompt)
      
      // Update local character data
      const updatedData = workflow.getCharacterData()
      setCharacterData(updatedData)
      
      setShowModificationDialog(false)
      setModificationRequest('')
      setModificationReason('')
      setCustomModificationPrompt('')
      setSelectedField({ field: '', value: '' })
    } catch (error) {
      console.error('Modification request failed:', error)
      alert('AI 수정 중 오류가 발생했습니다: ' + error)
    } finally {
      setLoading(false)
    }
  }

  // Handle manual modification
  const handleManualModification = () => {
    if (!workflow) return
    
    // Apply manual modification directly
    const updatedData = { ...characterData }
    ;(updatedData as any)[selectedField.field] = modificationRequest
    
    setCharacterData(updatedData)
    
    // Update workflow data
    const workflowData = workflow.getCharacterData()
    ;(workflowData as any)[selectedField.field] = modificationRequest
    
    // Reset dialog state
    setShowModificationDialog(false)
    setModificationRequest('')
    setModificationReason('')
    setCustomModificationPrompt('')
    setSelectedField({ field: '', value: '' })
  }

  // Handle lorebook editing
  const handleLorebookEdit = (index: number, updatedEntry: any) => {
    const updatedLorebook = [...lorebook]
    updatedLorebook[index] = updatedEntry
    setLorebook(updatedLorebook)
    
    // Update workflow lorebook
    if (workflow) {
      const workflowLorebook = workflow.getLorebook()
      workflowLorebook[index] = updatedEntry
    }
  }

  const addLorebookEntry = () => {
    const newEntry = {
      key: '',
      content: '',
      category: 'custom',
      priority: 5,
      enabled: true
    }
    setLorebook([...lorebook, newEntry])
    setEditingLorebookIndex(lorebook.length)
    setEditingLorebookData(newEntry)
    setShowLorebookEditor(true)
  }

  // Handle lorebook AI modification
  const handleLorebookAIModification = async () => {
    if (!workflow || !selectedAPI || !editingLorebookData) return
    
    setLoading(true)
    try {
      addDebugLog('🤖 로어북 AI 수정 시작')
      
      // Create AI modification prompt for lorebook entry
      const modificationPrompt = `당신은 로어북 전문 수정자입니다. 다음 로어북 엔트리를 요청에 따라 수정해주세요.

현재 로어북 엔트리:
- 키워드: "${editingLorebookData.key}"
- 카테고리: "${editingLorebookData.category}"
- 내용: "${editingLorebookData.content}"

수정 요청: ${lorebookModificationRequest}
수정 이유: ${lorebookModificationReason}

반드시 다음 JSON 형식으로 응답해주세요:
{
  "key": "수정된 키워드",
  "content": "수정된 내용",
  "category": "수정된 카테고리",
  "priority": 우선순위_숫자,
  "enabled": true
}

주의사항:
- JSON 내부에서는 줄바꿈 대신 \\n 사용
- 올바른 JSON 형식 유지`
      
      const { APIFactory } = await import('@/api/api-factory')
      const api = APIFactory.createAPI(selectedAPI)
      
      const response = await api.generateText({
        prompt: modificationPrompt,
        config: selectedAPI,
        systemPrompt: 'You are a helpful assistant that modifies lorebook entries according to user requests. Always respond with valid JSON.'
      })
      
      if (response.error) {
        addDebugLog(`❌ AI 수정 API 오류: ${response.error}`)
        alert(`AI 수정 중 오류가 발생했습니다: ${response.error}`)
        return
      }
      
      if (!response.content) {
        addDebugLog('❌ AI 수정 응답이 비어있음')
        alert('AI 수정 응답이 비어있습니다.')
        return
      }
      
      try {
        // Extract JSON from response
        const jsonMatch = response.content.match(/\{[\s\S]*\}/)
        if (!jsonMatch) {
          throw new Error('Valid JSON not found in response')
        }
        
        const modifiedEntry = JSON.parse(jsonMatch[0])
        addDebugLog('✅ 로어북 AI 수정 성공')
        
        // Update editing data with AI modifications
        setEditingLorebookData({
          ...editingLorebookData,
          ...modifiedEntry
        })
        
        // Clear modification requests
        setLorebookModificationRequest('')
        setLorebookModificationReason('')
        
      } catch (parseError) {
        addDebugLog(`❌ JSON 파싱 오류: ${parseError}`)
        alert(`AI 응답 파싱 중 오류가 발생했습니다: ${parseError}`)
      }
      
    } catch (error) {
      addDebugLog(`❌ 로어북 AI 수정 오류: ${error instanceof Error ? error.message : String(error)}`)
      alert(`AI 수정 중 오류가 발생했습니다: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setLoading(false)
    }
  }

  // Download character card as CHARX
  const downloadCharacterCard = async () => {
    addDebugLog('📦 CHARX 다운로드 버튼 클릭됨')
    
    if (!workflow) {
      addDebugLog('❌ 워크플로우 데이터가 없음')
      alert('워크플로우 데이터가 없습니다.')
      return
    }

    try {
      addDebugLog('🔄 다운로드 프로세스 시작')
      setLoading(true)
      
      // Get data from workflow
      addDebugLog('📝 워크플로우에서 데이터 가져오는 중...')
      const characterData = workflow.getCharacterData()
      const lorebook = workflow.getLorebook()
      const assetResults = workflow.getAssetResults()
      
      addDebugLog(`✅ 데이터 가져오기 완료 - 캐릭터: ${characterData?.name || 'Unknown'}, 로어북: ${lorebook?.length || 0}개, 에셋: ${assetResults.length}개`)
      
      console.log('downloadCharacterCard - assetResults:', assetResults.map(r => ({
        original: r.originalFileName,
        suggested: r.suggestedFileName,
        category: r.category
      })))
      
      // Create complete SPEC_V3 character card
      addDebugLog('🎯 CHARX 포맷 캐릭터 카드 생성 중...')
      const characterCard = {
        spec: 'chara_card_v3' as const,
        spec_version: '3.0' as const,
        data: {
          // Core required fields from SPEC_V3
          name: characterData.name || 'Unnamed Character',
          description: characterData.description || '',
          first_mes: characterData.first_mes || '',
          mes_example: characterData.mes_example || '',
          
          // V2 compatibility fields  
          tags: (characterData as any).tags || ['AI Generated', 'Five Stage Workflow'],
          creator: (characterData as any).creator || 'Five Stage Workflow Generator',
          character_version: (characterData as any).character_version || '1.0',
          system_prompt: characterData.system_prompt || '',
          post_history_instructions: characterData.post_history_instructions || '',
          alternate_greetings: characterData.alternate_greetings || [],
          extensions: {
            // Use existing RISU extensions that were properly set by integrateRisuDynamicAssets
            ...characterData.extensions,
            risuai: {
              // Keep existing RISU extensions intact, they have the correct asset names
              ...characterData.extensions?.risuai
            },
            fiveStageWorkflow: {
              version: '1.0',
              generatedAt: Date.now(),
              lorebookEntries: lorebook?.length || 0,
              assetCount: assetResults.length,
              modificationHistory: workflow.getModificationHistory()
            }
          },
          
          // V3 specific fields
          creator_notes: characterData.creator_notes || '',
          nickname: characterData.nickname,
          creator_notes_multilingual: characterData.creator_notes_multilingual,
          source: characterData.source,
          group_only_greetings: characterData.group_only_greetings || [],
          creation_date: characterData.creation_date || Math.floor(Date.now() / 1000),
          modification_date: Math.floor(Date.now() / 1000),
          
          // Character-specific lorebook
          character_book: lorebook && lorebook.length > 0 ? {
            name: `${characterData.name || 'Character'} Lorebook`,
            description: 'Character-specific lorebook generated by Five Stage Workflow',
            scan_depth: 40,
            token_budget: 2048,
            recursive_scanning: false,
            extensions: {},
            entries: lorebook.map((entry, index) => ({
              keys: [entry.key],
              content: entry.content,
              extensions: {},
              enabled: entry.enabled,
              insertion_order: entry.priority || index,
              case_sensitive: false,
              use_regex: false,
              constant: false,
              name: entry.key,
              priority: entry.priority || 5,
              id: index,
              comment: `Generated for category: ${entry.category}`
            }))
          } : undefined,
          
          // Asset information based on SPEC_V3
          assets: assetResults.length > 0 ? assetResults.map(result => {
            // Map our internal categories to proper SPEC_V3 asset types
            let assetType = 'icon'
            switch(result.category) {
              case 'profile':
                assetType = 'icon'
                break
              case 'emotion':
              case 'adult':
              case 'etc':
              default:
                assetType = 'emotion'
                break
            }
            
            return {
              type: assetType,
              uri: `embeded://assets/${result.category}/image/${result.suggestedFileName}`,
              name: result.suggestedFileName.replace(/\.[^/.]+$/, ''),
              ext: result.suggestedFileName.split('.').pop()?.toLowerCase() || 'png'
            }
          }) : [{
            type: 'icon',
            uri: 'ccdefault:',
            name: 'main',
            ext: 'png'
          }]
        }
      }

      // Convert assetResults to assetAnalyses format for CHARXExporter
      addDebugLog('🔄 에셋 분석 데이터 변환 중...')
      const assetAnalyses = assetResults.map(result => ({
        fileName: result.originalFileName,
        category: result.category,
        mediaType: 'image' as const,
        tags: [result.category, result.suggestedFileName.replace(/\.[^/.]+$/, '')],
        isNSFW: result.category === 'adult',
        confidence: result.confidence,
        aiGenerated: false,
        conditions: [],
        metadata: {
          originalName: result.originalFileName,
          suggestedName: result.suggestedFileName,
          analysisDate: Date.now(),
          reasoning: result.reasoning
        }
      }))
      addDebugLog(`✅ 에셋 분석 데이터 변환 완료 - ${assetAnalyses.length}개`)

      // Debug logging
      console.log('Character Card for CHARX Export:', JSON.stringify(characterCard, null, 2))
      console.log('Assets for export:', assets)
      console.log('Asset analyses:', assetAnalyses)

      try {
        // Import CHARXExporter
        addDebugLog('📦 CHARXExporter 모듈 로딩 중...')
        const { CHARXExporter } = await import('@/utils/charx-exporter')
        addDebugLog('✅ CHARXExporter 모듈 로딩 완료')
        
        console.log('About to call CHARXExporter.exportToCHARX...')
        console.log('CHARXExporter loaded successfully')
        
        // Export to CHARX format
        addDebugLog('🔄 CHARX 파일 생성 중...')
        const result = await CHARXExporter.exportToCHARX({
          characterCard,
          assets: assets,
          assetAnalyses: assetAnalyses,
          includeMetadata: true,
          compressionLevel: 'best'
        })
        addDebugLog(`✅ CHARX 파일 생성 완료 - 파일명: ${result.fileName}, 크기: ${(result.fileSize / 1024).toFixed(1)}KB`)

        console.log('CHARXExporter result:', result)
        
        // Download the file - Check if we're in Tauri environment
        addDebugLog('🔍 실행 환경 확인 중...')
        // invoke 함수를 직접 테스트하여 Tauri 환경 감지
        let isTauri = false
        try {
          if (typeof invoke === 'function') {
            addDebugLog('🔍 invoke 함수 발견, Tauri 테스트 시도...')
            // 간단한 test_command로 Tauri 연결 테스트
            await invoke('test_command')
            isTauri = true
            addDebugLog('✅ Tauri invoke 테스트 성공')
          } else {
            addDebugLog('❌ invoke 함수를 찾을 수 없음')
          }
        } catch (e) {
          addDebugLog(`❌ Tauri 테스트 실패: ${e instanceof Error ? e.message : String(e)}`)
          isTauri = false
        }
        addDebugLog(`🏷️ 실행 환경: ${isTauri ? 'Tauri 데스크톱' : '브라우저'}`)
        
        if (isTauri) {
          // Tauri environment - use simple invoke command
          addDebugLog('💾 Tauri 파일 저장 시도 중...')
          try {
            const savedPath = await saveTauriFile(result.fileName, result.blob)
            addDebugLog(`✅ Tauri 파일 저장 성공: ${savedPath}`)
            
            setCompletionMessage(`✅ 캐릭터 카드가 성공적으로 저장되었습니다!

파일 경로: ${savedPath}
크기: ${(result.fileSize / 1024).toFixed(1)}KB
에셋: ${result.metadata.assetCount}개 포함
압축률: ${result.metadata.compressionRatio.toFixed(1)}%`)
            setShowCompletionModal(true)
            
          } catch (tauriError) {
            addDebugLog(`❌ Tauri 파일 저장 실패: ${tauriError instanceof Error ? tauriError.message : String(tauriError)}`)
            console.error('Tauri save error:', tauriError)
            // Fallback to browser download
            addDebugLog('🔄 브라우저 다운로드로 폴백 시도 중...')
            const url = URL.createObjectURL(result.blob)
            const a = document.createElement('a')
            a.href = url
            a.download = result.fileName
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            URL.revokeObjectURL(url)
            addDebugLog('✅ 브라우저 다운로드 폴백 완료')
            
            setCompletionMessage(`✅ 캐릭터 카드가 성공적으로 다운로드되었습니다!

파일명: ${result.fileName}
크기: ${(result.fileSize / 1024).toFixed(1)}KB
에셋: ${result.metadata.assetCount}개 포함
압축률: ${result.metadata.compressionRatio.toFixed(1)}%`)
            setShowCompletionModal(true)
          }
        } else {
          // Browser environment - use standard download
          addDebugLog('💾 브라우저 표준 다운로드 시작...')
          const url = URL.createObjectURL(result.blob)
          const a = document.createElement('a')
          a.href = url
          a.download = result.fileName
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          URL.revokeObjectURL(url)
          addDebugLog('✅ 브라우저 표준 다운로드 완료')
          
          setCompletionMessage(`✅ 캐릭터 카드가 성공적으로 다운로드되었습니다!

파일명: ${result.fileName}
크기: ${(result.fileSize / 1024).toFixed(1)}KB
에셋: ${result.metadata.assetCount}개 포함
압축률: ${result.metadata.compressionRatio.toFixed(1)}%`)
          setShowCompletionModal(true)
        }
        
      } catch (exportError) {
        addDebugLog(`❌ CHARX 내보내기 오류: ${exportError instanceof Error ? exportError.message : String(exportError)}`)
        console.error('CHARXExporter error details:', exportError)
        
        // More detailed error handling
        let errorMessage = 'CHARX 파일 생성 중 오류가 발생했습니다.'
        
        if (exportError instanceof Error) {
          if (exportError.message.includes('JSZip')) {
            errorMessage = 'JSZip 라이브러리 로딩 오류가 발생했습니다. 페이지를 새로고침해주세요.'
          } else if (exportError.message.includes('disconnect')) {
            errorMessage = 'ZIP 파일 생성 중 연결 오류가 발생했습니다. 다시 시도해주세요.'
          } else {
            errorMessage = `CHARX 생성 오류: ${exportError.message}`
          }
        }
        
        alert(`❌ ${errorMessage}`)
        
        // Fallback: try simple JSON download if CHARX export fails
        addDebugLog('🔄 JSON 백업 다운로드 시도 중...')
        console.log('Attempting fallback JSON download...')
        try {
          const jsonData = JSON.stringify(characterCard, null, 2)
          const jsonBlob = new Blob([jsonData], { type: 'application/json' })
          const jsonUrl = URL.createObjectURL(jsonBlob)
          const jsonLink = document.createElement('a')
          jsonLink.href = jsonUrl
          jsonLink.download = `${characterCard.data.name || 'character'}_fallback.json`
          document.body.appendChild(jsonLink)
          jsonLink.click()
          document.body.removeChild(jsonLink)
          URL.revokeObjectURL(jsonUrl)
          addDebugLog('✅ JSON 백업 다운로드 완료')
          
          setCompletionMessage('💾 CHARX 생성에 실패하여 JSON 파일로 백업 저장했습니다.')
          setShowCompletionModal(true)
        } catch (fallbackError) {
          addDebugLog(`❌ JSON 백업 다운로드도 실패: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`)
          console.error('Fallback download also failed:', fallbackError)
        }
      }
      
    } catch (outerError) {
      addDebugLog(`❌ 전체 다운로드 프로세스 실패: ${outerError instanceof Error ? outerError.message : String(outerError)}`)
      console.error('Overall download process failed:', outerError)
      alert(`❌ 다운로드 준비 중 오류가 발생했습니다: ${outerError instanceof Error ? outerError.message : String(outerError)}`)
    } finally {
      addDebugLog('🔄 다운로드 프로세스 종료, 로딩 상태 해제')
      setLoading(false)
    }
  }

  // Use Tauri invoke to save binary file  
  // 디버그 로그 함수
  const addDebugLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    const logEntry = `[${timestamp}] ${message}`
    setDebugLog(prev => [...prev, logEntry])
    console.log(logEntry) // 콘솔에도 출력 (개발 시 확인용)
  }

  const clearDebugLog = () => {
    setDebugLog([])
  }

  const saveTauriFile = async (filename: string, blob: Blob): Promise<string> => {
    addDebugLog(`🔧 saveTauriFile 호출: ${filename}`)
    
    try {
      if (typeof invoke !== 'function') {
        addDebugLog('❌ invoke 함수를 사용할 수 없음')
        throw new Error('Tauri invoke not available')
      }
      
      addDebugLog('🔄 Blob을 ArrayBuffer로 변환 중...')
      const arrayBuffer = await blob.arrayBuffer()
      const uint8Array = new Uint8Array(arrayBuffer)
      const content = Array.from(uint8Array) // Convert to regular array for JSON serialization
      addDebugLog(`✅ 파일 데이터 준비 완료 - 크기: ${content.length} bytes`)
      
      addDebugLog('🚀 Tauri save_file_simple 명령 실행 중...')
      addDebugLog(`📁 저장 시도 위치: 현재 디렉토리 -> 데스크톱 -> 다운로드 폴더 순서`)
      
      const result = await invoke('save_file_simple', { filename, content })
      addDebugLog(`✅ Tauri 파일 저장 성공: ${result}`)
      return result as string
      
    } catch (invokeError) {
      addDebugLog(`❌ Tauri invoke 실행 오류: ${invokeError instanceof Error ? invokeError.message : String(invokeError)}`)
      if (invokeError instanceof Error && invokeError.stack) {
        addDebugLog(`❌ 오류 스택: ${invokeError.stack}`)
      }
      throw invokeError
    }
  }

  // Initialize workflow on mount
  React.useEffect(() => {
    initializeWorkflow()
  }, [initializeWorkflow])


  const stages = workflow?.getStages() || []

  const getStageStatus = (stageIndex: number) => {
    const stage = stages[stageIndex]
    if (!stage) return 'pending'
    return stage.status
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return '✅'
      case 'failed':
        return '❌'
      case 'in_progress':
        return '⏳'
      default:
        return '⭕'
    }
  }

  return (
    <div className="five-stage-workflow">
      {/* 디버그 패널 */}
      {showDebugPanel && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          width: '400px',
          maxHeight: '500px',
          backgroundColor: '#1e1e1e',
          color: '#ffffff',
          border: '1px solid #333',
          borderRadius: '8px',
          padding: '16px',
          fontSize: '12px',
          fontFamily: 'monospace',
          overflow: 'auto',
          zIndex: 10000,
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ margin: 0, color: '#4CAF50' }}>🔍 Tauri 디버그</h3>
            <div>
              <button 
                onClick={clearDebugLog}
                style={{ background: '#333', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', marginRight: '8px', cursor: 'pointer' }}
              >
                지우기
              </button>
              <button 
                onClick={() => setShowDebugPanel(false)}
                style={{ background: '#f44336', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>
          </div>
          <div style={{ maxHeight: '400px', overflow: 'auto' }}>
            {debugLog.length === 0 ? (
              <p style={{ color: '#999', fontStyle: 'italic' }}>디버그 로그가 없습니다.</p>
            ) : (
              debugLog.map((log, index) => (
                <div key={index} style={{ 
                  marginBottom: '4px', 
                  padding: '4px 8px', 
                  backgroundColor: log.includes('❌') ? '#4a1b1b' : log.includes('✅') ? '#1b4a1b' : '#2a2a2a',
                  borderRadius: '4px',
                  wordBreak: 'break-all'
                }}>
                  {log}
                </div>
              ))
            )}
          </div>
        </div>
      )}
      <div className="workflow-header">
        <h2>5단계 캐릭터 생성 워크플로우</h2>
        <p>RISU 다이나믹 에셋 시스템 지원</p>
        <div className="workflow-controls">
          <button 
            className="btn btn-secondary btn-small"
            onClick={() => setShowSettings(!showSettings)}
          >
            🔧 API 설정
          </button>
          <button 
            className="btn btn-secondary btn-small"
            onClick={() => setShowPromptEditor(!showPromptEditor)}
          >
            ⚙️ 프롬프트 편집
          </button>
          <button 
            className="btn btn-secondary btn-small"
            onClick={() => {
              setShowDebugPanel(!showDebugPanel)
            }}
          >
            🔍 디버그 로그 {showDebugPanel ? '숨기기' : '보기'}
          </button>
          <label className="prompt-toggle">
            <input
              type="checkbox"
              checked={useCustomPrompts}
              onChange={(e) => setUseCustomPrompts(e.target.checked)}
            />
            커스텀 프롬프트 사용
          </label>
        </div>
      </div>

      {/* API Settings Panel */}
      {showSettings && (
        <div className="prompt-editor-panel">
          <div className="prompt-editor-content">
            <div className="prompt-editor-header">
              <h3>API 설정</h3>
              <button 
                className="btn-close"
                onClick={() => setShowSettings(false)}
              >
                ×
              </button>
            </div>
            <APISetup />
          </div>
        </div>
      )}

      {/* Prompt Editor Panel */}
      {showPromptEditor && (
        <div className="prompt-editor-panel">
          <div className="prompt-editor-content">
            <div className="prompt-editor-header">
              <h3>프롬프트 편집기</h3>
              <button 
                className="btn-close"
                onClick={() => setShowPromptEditor(false)}
              >
                ×
              </button>
            </div>
            <div className="prompt-section">
              <h4>1단계: 캐릭터 생성 프롬프트</h4>
              <textarea
                value={customCharacterPrompt}
                onChange={(e) => setCustomCharacterPrompt(e.target.value)}
                placeholder={`기본 캐릭터 생성 프롬프트를 입력하세요.

사용 가능한 변수:
- {{characterInput}} - 사용자가 입력한 캐릭터 설정
- {{additionalDetails}} - 추가 세부사항

예시:
당신은 전문적인 캐릭터 생성자입니다. 다음 정보를 바탕으로 매력적인 캐릭터를 생성해주세요:

캐릭터 설정: {{characterInput}}

다음 JSON 형식으로 응답해주세요 (JSON 안전성 주의):
{
  "name": "캐릭터 이름",
  "description": "캐릭터 설명",
  "personality": "성격",
  "scenario": "시나리오", 
  "first_mes": "첫 메시지",
  "mes_example": "대화 예시"
}

주의사항:
- JSON 내부에서 줄바꿈 금지 (공백 사용)
- 따옴표는 \\" 로 이스케이프
- 올바른 JSON 형식 유지`}
                rows={12}
                className="prompt-textarea"
              />
            </div>

            <div className="prompt-section">
              <h4>2단계: 로어북 생성 프롬프트</h4>
              <textarea
                value={customLorebookPrompt}
                onChange={(e) => setCustomLorebookPrompt(e.target.value)}
                placeholder={`기본 로어북 생성 프롬프트를 입력하세요.

사용 가능한 변수:
- {{characterName}} - 캐릭터 이름
- {{characterDescription}} - 캐릭터 설명
- {{characterPersonality}} - 캐릭터 성격
- {{characterScenario}} - 캐릭터 시나리오
- {{requirements}} - 사용자 특별 요구사항

예시:
당신은 세계관 설정 전문가입니다. 다음 캐릭터에 특화된 로어북을 생성해주세요:

캐릭터 정보:
- 이름: {{characterName}}
- 배경: {{characterDescription}}
- 성격: {{characterPersonality}}
- 상황: {{characterScenario}}

{{#if requirements}}
사용자 요구사항: {{requirements}}
{{/if}}

다음 JSON 형식으로 로어북 엔트리들을 생성해주세요 (JSON 안전성 주의):
{
  "lorebook": [
    {
      "key": "로어북 키워드",
      "content": "상세한 설명 내용",
      "category": "세계관|지역|인물|문화|특별설정",
      "priority": 5,
      "enabled": true
    }
  ]
}

주의사항:
- JSON 내부에서 줄바꿈 금지 (공백 사용)
- 따옴표는 \\" 로 이스케이프
- 올바른 JSON 형식 유지`}
                rows={15}
                className="prompt-textarea"
              />
            </div>

            <div className="prompt-editor-actions">
              <button 
                className="btn btn-secondary"
                onClick={() => {
                  setCustomCharacterPrompt('')
                  setCustomLorebookPrompt('')
                }}
              >
                초기화
              </button>
              <button 
                className="btn btn-primary"
                onClick={() => {
                  setUseCustomPrompts(true)
                  setShowPromptEditor(false)
                  alert('커스텀 프롬프트가 저장되었습니다!')
                }}
              >
                저장 및 적용
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Progress Bar */}
      <div className="workflow-progress">
        <div className="progress-steps">
          {['캐릭터 생성', '로어북 생성', '에셋 처리', '수정 요청', '최종 출력'].map((step, index) => (
            <div 
              key={index} 
              className={`step ${index <= activeStep ? 'active' : ''} ${getStageStatus(index) === 'completed' ? 'completed' : ''}`}
            >
              <div className="step-number">
                {getStatusIcon(getStageStatus(index))} {index + 1}
              </div>
              <div className="step-label">{step}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Stage Content */}
      <div className="stage-content">
        {/* Stage 1: Character Generation */}
        {activeStep === 0 && (
          <div className="stage-card">
            <h3>1단계: 캐릭터 기본 정보 입력 및 생성</h3>
            <p>캐릭터의 기본 정보를 입력하고 디스크립션을 생성합니다.</p>
            
            {/* Output Format Selection */}
            <div className="output-format-selection" style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px' }}>
              <h4 style={{ marginBottom: '1rem' }}>출력 형식 설정</h4>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <label htmlFor="character-format">캐릭터 출력 형식</label>
                  <select
                    id="character-format"
                    value={characterOutputFormat}
                    onChange={(e) => setCharacterOutputFormat(e.target.value as 'narrative' | 'sheet' | 'narrative_sheet')}
                  >
                    <option value="narrative">문장형</option>
                    <option value="sheet">시트형</option>
                    <option value="narrative_sheet">문장+시트형</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label htmlFor="lorebook-format">로어북 출력 형식</label>
                  <select
                    id="lorebook-format"
                    value={lorebookOutputFormat}
                    onChange={(e) => setLorebookOutputFormat(e.target.value as 'narrative' | 'sheet' | 'narrative_sheet')}
                  >
                    <option value="narrative">문장형</option>
                    <option value="sheet">시트형</option>
                    <option value="narrative_sheet">문장+시트형</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label htmlFor="detail-level">출력 상세도</label>
                  <select
                    id="detail-level"
                    value={outputDetailLevel}
                    onChange={(e) => setOutputDetailLevel(e.target.value as 'simple' | 'normal' | 'detailed')}
                  >
                    <option value="simple">간단</option>
                    <option value="normal">보통</option>
                    <option value="detailed">상세</option>
                  </select>
                </div>
              </div>
              
              <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                <p><strong>문장형:</strong> 자연스러운 문장으로 서술 | <strong>시트형:</strong> 구조화된 정보 나열 | <strong>문장+시트형:</strong> 두 형식 모두 포함</p>
              </div>
            </div>

            {/* Character Input Form - Simple */}
            <div className="form-group">
              <label htmlFor="character-description">캐릭터 설정 *</label>
              <textarea
                id="character-description"
                value={localCharacterInput.additionalDetails || ''}
                onChange={(e) => handleCharacterInputChange({ additionalDetails: e.target.value })}
                placeholder={`캐릭터에 대한 모든 설정을 자유롭게 입력하세요.

예시:
이름: 사쿠라 미유키
나이: 19세
성별: 여성
배경: 현대 일본의 고등학교
성격: 활발하고 밝은 성격이지만 때로는 소심한 면도 있다
특징: 분홍색 머리카락과 큰 눈이 특징적이다
취미: 독서와 그림 그리기를 좋아한다`}
                rows={8}
                style={{ minHeight: '200px' }}
              />
              <small className="form-help">
                입력 형식과 관계없이 위에서 선택한 출력 형식으로 생성됩니다.
              </small>
            </div>

            <div className="input-summary">
              <h4>입력된 내용:</h4>
              <div className="character-preview">
                {localCharacterInput.additionalDetails ? (
                  <p>{localCharacterInput.additionalDetails.substring(0, 200)}{localCharacterInput.additionalDetails.length > 200 && '...'}</p>
                ) : (
                  <p className="placeholder-text">캐릭터 설정을 입력해주세요</p>
                )}
              </div>
            </div>

            {loading && <div className="loading">캐릭터 생성 중...</div>}
            
            {characterData && (
              <div className="success-message">
                ✅ 캐릭터 기본 정보가 생성되었습니다!
              </div>
            )}

            <div className="stage-actions">
              <button 
                className="btn btn-secondary btn-small" 
                onClick={testAPIConnection}
                disabled={loading || !selectedAPI}
              >
                🔧 API 연결 테스트
              </button>
              
              <button 
                className="btn btn-primary" 
                onClick={() => executeStage(1)}
                disabled={loading || !localCharacterInput.additionalDetails?.trim() || getStageStatus(0) === 'completed'}
              >
                {getStageStatus(0) === 'completed' ? '완료됨' : '캐릭터 생성 시작'}
              </button>
              
              {getStageStatus(0) === 'completed' && (
                <button 
                  className="btn btn-secondary" 
                  onClick={() => goToNextStage()}
                >
                  다음 단계로
                </button>
              )}
            </div>
            
            {!localCharacterInput.additionalDetails?.trim() && (
              <p className="form-help">캐릭터 설정을 입력해주세요.</p>
            )}
          </div>
        )}

        {/* Stage 2: Lorebook Generation */}
        {activeStep === 1 && (
          <div className="stage-card">
            <h3>2단계: 캐릭터 전용 로어북 생성</h3>
            <p>캐릭터에 특화된 세계관과 배경 정보 로어북을 생성합니다.</p>

            {/* Lorebook Requirements Input */}
            <div className="form-group">
              <label htmlFor="lorebook-requirements">로어북 특별 요구사항 (선택사항)</label>
              <textarea
                id="lorebook-requirements"
                value={lorebookRequirements}
                onChange={(e) => setLorebookRequirements(e.target.value)}
                placeholder={`로어북에 포함하고 싶은 특별한 요구사항을 입력하세요.

예시:
- 판타지 중세 세계관으로 설정
- 마법 시스템에 대한 자세한 설명 포함
- 캐릭터의 고향과 가족 관계 중심으로
- 학교나 직장 환경에 대한 상세 정보
- 특정 이벤트나 사건들에 대한 배경

입력하지 않으면 캐릭터 정보를 바탕으로 자동 생성됩니다.`}
                rows={6}
                style={{ minHeight: '150px' }}
              />
              <small className="form-help">
                특별한 요구사항이 없다면 비워두셔도 됩니다. AI가 캐릭터에 맞는 로어북을 자동으로 생성합니다.
              </small>
            </div>

            {loading && <div className="loading">로어북 생성 중...</div>}

            {lorebook && lorebook.length > 0 && (
              <div className="lorebook-preview">
                <h4>생성된 로어북 엔트리: {lorebook.length}개</h4>
                <div className="lorebook-list">
                  {lorebook.slice(0, 3).map((entry, index) => (
                    <div key={index} className="lorebook-item">
                      <strong>{entry.key}</strong> ({entry.category})
                      <p>{entry.content.substring(0, 100)}...</p>
                    </div>
                  ))}
                  {lorebook.length > 3 && (
                    <p>...외 {lorebook.length - 3}개 더</p>
                  )}
                </div>
              </div>
            )}

            <div className="stage-actions">
              <button 
                className="btn btn-secondary" 
                onClick={() => goToPreviousStage()}
              >
                이전 단계
              </button>
              
              <button 
                className="btn btn-primary" 
                onClick={() => executeStage(2)}
                disabled={loading || getStageStatus(1) === 'completed'}
              >
                {getStageStatus(1) === 'completed' ? '완료됨' : '로어북 생성 시작'}
              </button>
              
              {getStageStatus(1) === 'completed' && (
                <button 
                  className="btn btn-secondary" 
                  onClick={() => goToNextStage()}
                >
                  다음 단계로
                </button>
              )}
            </div>
          </div>
        )}

        {/* Stage 3: Asset Processing */}
        {activeStep === 2 && (
          <div className="stage-card">
            <h3>3단계: RISU 다이나믹 에셋 처리</h3>
            <p>에셋을 카테고리별로 업로드하고 AI가 자동으로 분류 및 이름을 변경합니다.</p>

            {/* Categorized Asset Upload */}
            <div className="categorized-asset-upload">
              <div className="upload-categories">
                {/* Profile Category */}
                <div className="upload-category">
                  <h4>👤 프로필 이미지</h4>
                  <p>캐릭터의 기본 프로필, 전신샷 등</p>
                  <div className="upload-area" onClick={() => fileInputRefs.current.profile?.click()}>
                    <div className="upload-icon">👤</div>
                    <span>프로필 이미지 업로드</span>
                    <input
                      ref={el => fileInputRefs.current.profile = el}
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleCategorizedFileUpload('profile')}
                      style={{ display: 'none' }}
                    />
                  </div>
                  {categorizedAssets.profile.length > 0 && (
                    <div className="file-management-section">
                      <div className="bulk-rename-controls">
                        <h5>일괄 파일명 수정</h5>
                        <div className="bulk-controls">
                          <input
                            type="text"
                            placeholder="앞에 추가할 텍스트"
                            value={bulkRenameSettings.profile.prefix}
                            onChange={(e) => setBulkRenameSettings(prev => ({
                              ...prev,
                              profile: { ...prev.profile, prefix: e.target.value }
                            }))}
                          />
                          <input
                            type="text"
                            placeholder="뒤에 추가할 텍스트 (숫자는 {i})"
                            value={bulkRenameSettings.profile.suffix}
                            onChange={(e) => setBulkRenameSettings(prev => ({
                              ...prev,
                              profile: { ...prev.profile, suffix: e.target.value }
                            }))}
                          />
                          <label>
                            <input
                              type="checkbox"
                              checked={bulkRenameSettings.profile.removeExtension}
                              onChange={(e) => setBulkRenameSettings(prev => ({
                                ...prev,
                                profile: { ...prev.profile, removeExtension: e.target.checked }
                              }))}
                            />
                            확장자 제거
                          </label>
                          <button 
                            className="btn btn-small"
                            onClick={() => applyBulkRename('profile')}
                          >
                            적용
                          </button>
                        </div>
                      </div>
                      <div className="uploaded-files">
                        {categorizedAssets.profile.map((file, index) => (
                          <div key={index} className="file-item-detailed">
                            <div className="file-thumbnail">
                              <img 
                                src={URL.createObjectURL(file)} 
                                alt={file.name}
                                className="thumbnail-img"
                              />
                            </div>
                            <div className="file-info">
                              <div className="original-name">원본: {file.name}</div>
                              <input
                                type="text"
                                className="filename-input"
                                value={fileNames.profile[file.name] || file.name}
                                onChange={(e) => updateFileName('profile', file.name, e.target.value)}
                                placeholder="파일명 입력"
                              />
                            </div>
                            <button 
                              className="btn-remove"
                              onClick={() => removeCategorizedFile('profile', index)}
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Emotion Category */}
                <div className="upload-category">
                  <h4>😊 감정 표현</h4>
                  <p>다양한 감정 상태의 표정들</p>
                  <div className="upload-area" onClick={() => fileInputRefs.current.emotion?.click()}>
                    <div className="upload-icon">😊</div>
                    <span>감정 이미지 업로드</span>
                    <input
                      ref={el => fileInputRefs.current.emotion = el}
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleCategorizedFileUpload('emotion')}
                      style={{ display: 'none' }}
                    />
                  </div>
                  {categorizedAssets.emotion.length > 0 && (
                    <div className="file-management-section">
                      <div className="bulk-rename-controls">
                        <h5>일괄 파일명 수정</h5>
                        <div className="bulk-controls">
                          <input
                            type="text"
                            placeholder="앞에 추가할 텍스트"
                            value={bulkRenameSettings.emotion.prefix}
                            onChange={(e) => setBulkRenameSettings(prev => ({
                              ...prev,
                              emotion: { ...prev.emotion, prefix: e.target.value }
                            }))}
                          />
                          <input
                            type="text"
                            placeholder="뒤에 추가할 텍스트 (숫자는 {i})"
                            value={bulkRenameSettings.emotion.suffix}
                            onChange={(e) => setBulkRenameSettings(prev => ({
                              ...prev,
                              emotion: { ...prev.emotion, suffix: e.target.value }
                            }))}
                          />
                          <label>
                            <input
                              type="checkbox"
                              checked={bulkRenameSettings.emotion.removeExtension}
                              onChange={(e) => setBulkRenameSettings(prev => ({
                                ...prev,
                                emotion: { ...prev.emotion, removeExtension: e.target.checked }
                              }))}
                            />
                            확장자 제거
                          </label>
                          <button 
                            className="btn btn-small"
                            onClick={() => applyBulkRename('emotion')}
                          >
                            적용
                          </button>
                        </div>
                      </div>
                      <div className="uploaded-files">
                        {categorizedAssets.emotion.map((file, index) => (
                          <div key={index} className="file-item-detailed">
                            <div className="file-thumbnail">
                              <img 
                                src={URL.createObjectURL(file)} 
                                alt={file.name}
                                className="thumbnail-img"
                              />
                            </div>
                            <div className="file-info">
                              <div className="original-name">원본: {file.name}</div>
                              <input
                                type="text"
                                className="filename-input"
                                value={fileNames.emotion[file.name] || file.name}
                                onChange={(e) => updateFileName('emotion', file.name, e.target.value)}
                                placeholder="파일명 입력"
                              />
                            </div>
                            <button 
                              className="btn-remove"
                              onClick={() => removeCategorizedFile('emotion', index)}
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Adult Category */}
                <div className="upload-category">
                  <h4>🔞 성인 콘텐츠</h4>
                  <p>성인용 이미지 (18세 이상)</p>
                  <div className="upload-area" onClick={() => fileInputRefs.current.adult?.click()}>
                    <div className="upload-icon">🔞</div>
                    <span>성인 이미지 업로드</span>
                    <input
                      ref={el => fileInputRefs.current.adult = el}
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleCategorizedFileUpload('adult')}
                      style={{ display: 'none' }}
                    />
                  </div>
                  {categorizedAssets.adult.length > 0 && (
                    <div className="file-management-section">
                      <div className="bulk-rename-controls">
                        <h5>일괄 파일명 수정</h5>
                        <div className="bulk-controls">
                          <input
                            type="text"
                            placeholder="앞에 추가할 텍스트"
                            value={bulkRenameSettings.adult.prefix}
                            onChange={(e) => setBulkRenameSettings(prev => ({
                              ...prev,
                              adult: { ...prev.adult, prefix: e.target.value }
                            }))}
                          />
                          <input
                            type="text"
                            placeholder="뒤에 추가할 텍스트 (숫자는 {i})"
                            value={bulkRenameSettings.adult.suffix}
                            onChange={(e) => setBulkRenameSettings(prev => ({
                              ...prev,
                              adult: { ...prev.adult, suffix: e.target.value }
                            }))}
                          />
                          <label>
                            <input
                              type="checkbox"
                              checked={bulkRenameSettings.adult.removeExtension}
                              onChange={(e) => setBulkRenameSettings(prev => ({
                                ...prev,
                                adult: { ...prev.adult, removeExtension: e.target.checked }
                              }))}
                            />
                            확장자 제거
                          </label>
                          <button 
                            className="btn btn-small"
                            onClick={() => applyBulkRename('adult')}
                          >
                            적용
                          </button>
                        </div>
                      </div>
                      <div className="uploaded-files">
                        {categorizedAssets.adult.map((file, index) => (
                          <div key={index} className="file-item-detailed">
                            <div className="file-thumbnail">
                              <img 
                                src={URL.createObjectURL(file)} 
                                alt={file.name}
                                className="thumbnail-img"
                              />
                            </div>
                            <div className="file-info">
                              <div className="original-name">원본: {file.name}</div>
                              <input
                                type="text"
                                className="filename-input"
                                value={fileNames.adult[file.name] || file.name}
                                onChange={(e) => updateFileName('adult', file.name, e.target.value)}
                                placeholder="파일명 입력"
                              />
                            </div>
                            <button 
                              className="btn-remove"
                              onClick={() => removeCategorizedFile('adult', index)}
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Etc Category */}
                <div className="upload-category">
                  <h4>📦 기타</h4>
                  <p>기타 이미지들</p>
                  <div className="upload-area" onClick={() => fileInputRefs.current.etc?.click()}>
                    <div className="upload-icon">📦</div>
                    <span>기타 이미지 업로드</span>
                    <input
                      ref={el => fileInputRefs.current.etc = el}
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleCategorizedFileUpload('etc')}
                      style={{ display: 'none' }}
                    />
                  </div>
                  {categorizedAssets.etc.length > 0 && (
                    <div className="file-management-section">
                      <div className="bulk-rename-controls">
                        <h5>일괄 파일명 수정</h5>
                        <div className="bulk-controls">
                          <input
                            type="text"
                            placeholder="앞에 추가할 텍스트"
                            value={bulkRenameSettings.etc.prefix}
                            onChange={(e) => setBulkRenameSettings(prev => ({
                              ...prev,
                              etc: { ...prev.etc, prefix: e.target.value }
                            }))}
                          />
                          <input
                            type="text"
                            placeholder="뒤에 추가할 텍스트 (숫자는 {i})"
                            value={bulkRenameSettings.etc.suffix}
                            onChange={(e) => setBulkRenameSettings(prev => ({
                              ...prev,
                              etc: { ...prev.etc, suffix: e.target.value }
                            }))}
                          />
                          <label>
                            <input
                              type="checkbox"
                              checked={bulkRenameSettings.etc.removeExtension}
                              onChange={(e) => setBulkRenameSettings(prev => ({
                                ...prev,
                                etc: { ...prev.etc, removeExtension: e.target.checked }
                              }))}
                            />
                            확장자 제거
                          </label>
                          <button 
                            className="btn btn-small"
                            onClick={() => applyBulkRename('etc')}
                          >
                            적용
                          </button>
                        </div>
                      </div>
                      <div className="uploaded-files">
                        {categorizedAssets.etc.map((file, index) => (
                          <div key={index} className="file-item-detailed">
                            <div className="file-thumbnail">
                              <img 
                                src={URL.createObjectURL(file)} 
                                alt={file.name}
                                className="thumbnail-img"
                              />
                            </div>
                            <div className="file-info">
                              <div className="original-name">원본: {file.name}</div>
                              <input
                                type="text"
                                className="filename-input"
                                value={fileNames.etc[file.name] || file.name}
                                onChange={(e) => updateFileName('etc', file.name, e.target.value)}
                                placeholder="파일명 입력"
                              />
                            </div>
                            <button 
                              className="btn-remove"
                              onClick={() => removeCategorizedFile('etc', index)}
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="upload-summary">
                <h4>업로드 현황</h4>
                <ul>
                  <li>프로필: {categorizedAssets.profile.length}개</li>
                  <li>감정: {categorizedAssets.emotion.length}개</li>
                  <li>성인 콘텐츠: {categorizedAssets.adult.length}개</li>
                  <li>기타: {categorizedAssets.etc.length}개</li>
                  <li><strong>총 {assets.length}개 파일</strong></li>
                </ul>
              </div>
            </div>


            {/* Asset Analysis Results */}
            {assetResults.length > 0 && (
              <div className="asset-results">
                <h4>AI 분석 결과 ({assetResults.length}개 파일)</h4>
                <div className="results-list">
                  {assetResults.map((result, index) => (
                    <div key={index} className="result-item">
                      <div className="rename-info">
                        <strong>{result.originalFileName}</strong> → <strong>{result.suggestedFileName}</strong>
                      </div>
                      <div className="analysis-info">
                        <span className={`category category-${result.category}`}>{result.category}</span>
                        <span className="confidence">신뢰도: {result.confidence}%</span>
                        {result.confidence < 70 && <span className="warning">⚠️</span>}
                      </div>
                      <div className="reasoning">{result.reasoning}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {loading && <div className="loading">에셋 처리 중...</div>}

            <div className="stage-actions">
              <button 
                className="btn btn-secondary" 
                onClick={() => goToPreviousStage()}
              >
                이전 단계
              </button>
              
              <button 
                className="btn btn-primary" 
                onClick={() => executeStage(3)}
                disabled={loading || assets.length === 0 || getStageStatus(2) === 'completed'}
              >
                {getStageStatus(2) === 'completed' ? '에셋 처리 완료됨' : '에셋 처리 시작'}
              </button>
              
              <button 
                className="btn btn-secondary" 
                onClick={() => goToNextStage()}
              >
                건너뛰기 / 다음 단계
              </button>
            </div>
          </div>
        )}

        {/* Stage 4: Modification Requests */}
        {activeStep === 3 && (
          <div className="stage-card">
            <h3>4단계: 캐릭터 정보 수정</h3>
            <p>생성된 캐릭터 정보를 검토하고 필요한 부분을 수정할 수 있습니다.</p>

            {/* Character Data Display */}
            {characterData && (
              <div className="character-review">
                <h4>현재 캐릭터 정보</h4>
                <div className="character-fields">
                  {Object.entries(characterData).map(([key, value]) => (
                    key !== 'creation_date' && key !== 'modification_date' && key !== 'extensions' && (
                      <div key={key} className="field-item">
                        <div className="field-content">
                          <h5>{key.replace(/_/g, ' ')}</h5>
                          <div className="field-value-container">
                            <p className={showFullContent ? 'full-content' : 'truncated-content'}>
                              {showFullContent ? String(value) : `${String(value).substring(0, 150)}${String(value).length > 150 ? '...' : ''}`}
                            </p>
                            {String(value).length > 150 && (
                              <button 
                                className="btn btn-small toggle-content"
                                onClick={() => setShowFullContent(!showFullContent)}
                              >
                                {showFullContent ? '간략히 보기' : '전체 보기'}
                              </button>
                            )}
                          </div>
                        </div>
                        <button
                          className="btn btn-small"
                          onClick={() => {
                            setSelectedField({ field: key, value: String(value) })
                            // Pre-fill based on edit mode: current value for manual, empty for AI
                            setModificationRequest(editMode === 'manual' ? String(value) : '')
                            setShowModificationDialog(true)
                          }}
                        >
                          ✏️ 수정
                        </button>
                      </div>
                    )
                  ))}
                </div>
              </div>
            )}

            {/* Lorebook Display and Edit */}
            {lorebook && lorebook.length > 0 && (
              <div className="lorebook-review">
                <h4>로어북 엔트리 ({lorebook.length}개)</h4>
                <div className="lorebook-list">
                  {lorebook.map((entry, index) => (
                    <div key={index} className="lorebook-item">
                      <div className="lorebook-header">
                        <strong>{entry.key}</strong>
                        <span className="category-tag">({entry.category})</span>
                        <div className="lorebook-actions">
                          <button
                            className="btn btn-small"
                            onClick={() => {
                              setEditingLorebookIndex(index)
                              setEditingLorebookData({...entry})
                              setLorebookEditMode('manual')
                              setLorebookModificationRequest('')
                              setLorebookModificationReason('')
                              setShowLorebookEditor(true)
                            }}
                          >
                            ✏️ 수정
                          </button>
                          <button
                            className="btn btn-small btn-remove"
                            onClick={() => {
                              const updatedLorebook = lorebook.filter((_, i) => i !== index)
                              setLorebook(updatedLorebook)
                            }}
                          >
                            🗑️ 삭제
                          </button>
                        </div>
                      </div>
                      <div className="lorebook-content">
                        <p className={showFullContent ? 'full-content' : 'truncated-content'}>
                          {showFullContent ? entry.content : `${entry.content.substring(0, 200)}${entry.content.length > 200 ? '...' : ''}`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <button 
                  className="btn btn-secondary"
                  onClick={addLorebookEntry}
                >
                  + 새 로어북 엔트리 추가
                </button>
              </div>
            )}

            <div className="stage-actions">
              <button 
                className="btn btn-secondary" 
                onClick={() => goToPreviousStage()}
              >
                이전 단계
              </button>
              
              <button 
                className="btn btn-primary" 
                onClick={() => goToNextStage()}
              >
                최종 단계로
              </button>
            </div>
          </div>
        )}

        {/* Stage 5: Final Output */}
        {activeStep === 4 && (
          <div className="stage-card">
            <h3>5단계: 캐릭터 카드 완성</h3>
            <p>모든 단계가 완료되었습니다. 최종 캐릭터 카드를 다운로드할 수 있습니다.</p>

            <div className="completion-summary">
              <h4>🎉 생성 완료!</h4>
              <ul>
                <li>캐릭터 데이터: ✅ 완성</li>
                <li>로어북: {lorebook?.length || 0}개 엔트리</li>
                <li>에셋: {assetResults.length}개 처리됨</li>
              </ul>
            </div>

            <div className="stage-actions">
              <button 
                className="btn btn-secondary" 
                onClick={() => goToPreviousStage()}
              >
                이전 단계
              </button>
              
              <button 
                className="btn btn-primary btn-large"
                onClick={() => {
                  downloadCharacterCard()
                }}
                disabled={loading || !workflow}
              >
                {loading ? '생성 중...' : '📦 CHARX 캐릭터 카드 다운로드'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modification Dialog */}
      {showModificationDialog && (
        <div className="dialog-overlay" onClick={() => setShowModificationDialog(false)}>
          <div className="dialog modification-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-header">
              <h3>캐릭터 정보 수정</h3>
              <button className="dialog-close" onClick={() => setShowModificationDialog(false)}>×</button>
            </div>
            <div className="dialog-content">
              {/* Edit Mode Selection */}
              <div className="form-group">
                <label>수정 방식 선택</label>
                <div className="edit-mode-tabs">
                  <button
                    className={`tab ${editMode === 'manual' ? 'active' : ''}`}
                    onClick={() => {
                      setEditMode('manual')
                      // Switch to manual mode: pre-fill with current value
                      if (selectedField.value && !modificationRequest) {
                        setModificationRequest(selectedField.value)
                      }
                    }}
                  >
                    수동 수정
                  </button>
                  <button
                    className={`tab ${editMode === 'ai' ? 'active' : ''}`}
                    onClick={() => {
                      setEditMode('ai')
                      // Switch to AI mode: clear the field for new request
                      if (modificationRequest === selectedField.value) {
                        setModificationRequest('')
                      }
                    }}
                  >
                    AI 수정
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label>수정 대상: {selectedField.field.replace(/_/g, ' ')}</label>
                <div className="current-value">
                  <strong>현재 값:</strong>
                  <div className="value-display">
                    <p>{selectedField.value}</p>
                  </div>
                </div>
              </div>

              {editMode === 'manual' ? (
                <div className="form-group">
                  <label htmlFor="manual-edit">새로운 값</label>
                  <textarea
                    id="manual-edit"
                    value={modificationRequest}
                    onChange={(e) => setModificationRequest(e.target.value)}
                    placeholder="새로운 값을 직접 입력하세요..."
                    rows={8}
                    className="manual-edit-textarea"
                  />
                </div>
              ) : (
                <>
                  <div className="form-group">
                    <label htmlFor="modification-request">수정 요청 내용</label>
                    <textarea
                      id="modification-request"
                      value={modificationRequest}
                      onChange={(e) => setModificationRequest(e.target.value)}
                      placeholder="어떻게 수정하고 싶으신지 설명해주세요..."
                      rows={3}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="modification-reason">수정 이유</label>
                    <input
                      type="text"
                      id="modification-reason"
                      value={modificationReason}
                      onChange={(e) => setModificationReason(e.target.value)}
                      placeholder="수정이 필요한 이유를 간단히 설명해주세요..."
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="custom-prompt">사용자 정의 수정 프롬프트 (선택사항)</label>
                    <textarea
                      id="custom-prompt"
                      value={customModificationPrompt}
                      onChange={(e) => setCustomModificationPrompt(e.target.value)}
                      placeholder="AI에게 수정을 요청할 때 사용할 특별한 지시사항이 있다면 입력하세요..."
                      rows={3}
                    />
                    <small className="form-help">
                      비워두면 기본 수정 프롬프트를 사용합니다.<br/>
                      사용 가능한 변수: {`{{field}}`}, {`{{currentValue}}`}, {`{{requestedChange}}`}, {`{{reason}}`}, {`{{characterName}}`}
                    </small>
                  </div>
                </>
              )}
            </div>
            <div className="dialog-actions">
              <button 
                className="btn btn-secondary" 
                onClick={() => setShowModificationDialog(false)}
              >
                취소
              </button>
              <button 
                className="btn btn-primary" 
                onClick={editMode === 'manual' ? handleManualModification : handleModificationRequest}
                disabled={!modificationRequest || loading}
              >
                {loading ? '처리 중...' : (editMode === 'manual' ? '수동 수정 적용' : 'AI 수정 요청')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lorebook Editor Dialog */}
      {showLorebookEditor && (
        <div className="dialog-overlay" onClick={() => setShowLorebookEditor(false)}>
          <div className="dialog lorebook-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-header">
              <h3>로어북 엔트리 수정</h3>
              <button className="dialog-close" onClick={() => setShowLorebookEditor(false)}>×</button>
            </div>
            <div className="dialog-content">
              {/* Edit Mode Selection */}
              <div className="form-group">
                <label>수정 방식 선택</label>
                <div className="edit-mode-tabs">
                  <button
                    className={`tab ${lorebookEditMode === 'manual' ? 'active' : ''}`}
                    onClick={() => {
                      setLorebookEditMode('manual')
                      setLorebookModificationRequest('')
                      setLorebookModificationReason('')
                    }}
                  >
                    수동 수정
                  </button>
                  <button
                    className={`tab ${lorebookEditMode === 'ai' ? 'active' : ''}`}
                    onClick={() => {
                      setLorebookEditMode('ai')
                    }}
                  >
                    AI 수정
                  </button>
                </div>
              </div>
              
              <div className="form-group">
                <label htmlFor="lorebook-key">키워드</label>
                <input
                  type="text"
                  id="lorebook-key"
                  value={editingLorebookData?.key || ''}
                  onChange={(e) => setEditingLorebookData({...editingLorebookData, key: e.target.value})}
                  placeholder="트리거 키워드를 입력하세요..."
                />
              </div>
              <div className="form-group">
                <label htmlFor="lorebook-category">카테고리</label>
                <select
                  id="lorebook-category"
                  value={editingLorebookData?.category || 'custom'}
                  onChange={(e) => setEditingLorebookData({...editingLorebookData, category: e.target.value})}
                >
                  <option value="세계관">세계관</option>
                  <option value="지역">지역</option>
                  <option value="인물">인물</option>
                  <option value="문화">문화</option>
                  <option value="특별설정">특별설정</option>
                  <option value="custom">사용자 정의</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="lorebook-content">내용</label>
                <textarea
                  id="lorebook-content"
                  value={editingLorebookData?.content || ''}
                  onChange={(e) => setEditingLorebookData({...editingLorebookData, content: e.target.value})}
                  placeholder="로어북 엔트리의 상세 내용을 입력하세요..."
                  rows={8}
                />
              </div>
              <div className="form-group">
                <label htmlFor="lorebook-priority">우선순위 (1-10)</label>
                <input
                  type="number"
                  id="lorebook-priority"
                  min="1"
                  max="10"
                  value={editingLorebookData?.priority || 5}
                  onChange={(e) => setEditingLorebookData({...editingLorebookData, priority: parseInt(e.target.value)})}
                />
              </div>
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={editingLorebookData?.enabled !== false}
                    onChange={(e) => setEditingLorebookData({...editingLorebookData, enabled: e.target.checked})}
                  />
                  활성화
                </label>
              </div>
              
              {/* AI Modification Fields */}
              {lorebookEditMode === 'ai' && (
                <>
                  <div className="form-group">
                    <label htmlFor="lorebook-modification-request">수정 요청 내용</label>
                    <textarea
                      id="lorebook-modification-request"
                      value={lorebookModificationRequest}
                      onChange={(e) => setLorebookModificationRequest(e.target.value)}
                      placeholder="로어북 엔트리를 어떻게 수정하고 싶으신지 설명해주세요..."
                      rows={3}
                    />
                    <small className="form-help">
                      예시: "내용을 더 상세하게 설명해주세요", "키워드를 더 구체적으로 변경해주세요"
                    </small>
                  </div>
                  <div className="form-group">
                    <label htmlFor="lorebook-modification-reason">수정 이유</label>
                    <input
                      type="text"
                      id="lorebook-modification-reason"
                      value={lorebookModificationReason}
                      onChange={(e) => setLorebookModificationReason(e.target.value)}
                      placeholder="수정이 필요한 이유를 간단히 설명해주세요..."
                    />
                  </div>
                </>
              )}
            </div>
            <div className="dialog-actions">
              <button 
                className="btn btn-secondary" 
                onClick={() => {
                  setShowLorebookEditor(false)
                  setLorebookModificationRequest('')
                  setLorebookModificationReason('')
                }}
              >
                취소
              </button>
              
              {lorebookEditMode === 'ai' && (
                <button 
                  className="btn btn-secondary" 
                  onClick={handleLorebookAIModification}
                  disabled={!lorebookModificationRequest || loading}
                >
                  {loading ? '처리 중...' : 'AI 수정 실행'}
                </button>
              )}
              
              <button 
                className="btn btn-primary" 
                onClick={() => {
                  if (editingLorebookIndex >= 0 && editingLorebookData) {
                    const updatedLorebook = [...lorebook]
                    updatedLorebook[editingLorebookIndex] = editingLorebookData
                    setLorebook(updatedLorebook)
                    setShowLorebookEditor(false)
                    setEditingLorebookIndex(-1)
                    setEditingLorebookData(null)
                    setLorebookModificationRequest('')
                    setLorebookModificationReason('')
                  }
                }}
                disabled={!editingLorebookData?.key || !editingLorebookData?.content}
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Completion Modal */}
      {showCompletionModal && (
        <div className="dialog-overlay" onClick={() => setShowCompletionModal(false)}>
          <div className="dialog completion-modal" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-header">
              <h3>🎉 다운로드 완료</h3>
              <button className="dialog-close" onClick={() => setShowCompletionModal(false)}>×</button>
            </div>
            <div className="dialog-content">
              <div className="completion-message">
                {completionMessage.split('\n').map((line, index) => (
                  <div key={index}>{line}</div>
                ))}
              </div>
            </div>
            <div className="dialog-actions">
              <button 
                className="btn btn-primary" 
                onClick={() => setShowCompletionModal(false)}
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default FiveStageWorkflowComponent