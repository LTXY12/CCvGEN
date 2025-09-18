/**
 * Five-Stage Character Generation Workflow
 * 
 * 1. Character Generation (기본 설정 → 기본 디스크립션)
 * 2. Dedicated Lorebook Generation (전용 로어북 생성)
 * 3. Asset Input & Classification & Auto Rename (에셋 입력 및 분류와 자동 이름 변경)
 * 4. Modification Request System (수정 요청 기능)
 * 5. Final Output (출력)
 */

import { APIFactory } from '@/api/api-factory'
import { DynamicAssetRenamer, type AssetRenameResult } from '@/utils/dynamic-asset-renamer'
import { FileRenameManager } from '@/utils/file-rename-manager'
import type { APIConfig, CharacterInput, AssetAnalysis, GenerationRequest } from '@/types/api'
import type { CharacterData } from '@/types/character-card'
import { logger } from '@/utils/logger'

export interface WorkflowStage {
  id: number
  name: string
  description: string
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  result?: any
  errors?: string[]
}

export interface WorkflowConfig {
  apiConfig: APIConfig
  characterInput: CharacterInput
}

export interface LorebookEntry {
  keys: string[]
  content: string
  name: string
  comment: string
  enabled: boolean
  insertion_order: number
  constant: boolean
  selective: boolean
  case_sensitive: boolean
  use_regex: boolean
  extensions: {}
}

export interface ModificationRequest {
  stage: number
  field: string
  currentValue: string
  requestedChange: string
  reason: string
}

export class FiveStageWorkflow {
  private config: WorkflowConfig
  private stages: WorkflowStage[]
  private characterData: Partial<CharacterData> = {}
  private lorebook: LorebookEntry[] = []
  private assetResults: AssetRenameResult[] = []
  private modificationHistory: ModificationRequest[] = []
  private fileRenameManager: FileRenameManager = new FileRenameManager()

  constructor(config: WorkflowConfig) {
    this.config = config
    this.stages = this.initializeStages()
  }

  /**
   * Initialize workflow stages
   */
  private initializeStages(): WorkflowStage[] {
    return [
      {
        id: 1,
        name: '캐릭터 생성',
        description: '기본 설정을 바탕으로 캐릭터의 기본 디스크립션 생성',
        status: 'pending'
      },
      {
        id: 2,
        name: '전용 로어북 생성',
        description: '캐릭터에 특화된 세계관과 배경 정보 로어북 생성',
        status: 'pending'
      },
      {
        id: 3,
        name: '에셋 처리',
        description: '에셋 입력, 분류 및 RISU 다이나믹 에셋용 자동 이름 변경',
        status: 'pending'
      },
      {
        id: 4,
        name: '수정 요청 처리',
        description: '사용자 피드백을 바탕으로 캐릭터 정보 수정',
        status: 'pending'
      },
      {
        id: 5,
        name: '최종 출력',
        description: '완성된 캐릭터 카드와 에셋을 최종 패키징',
        status: 'pending'
      }
    ]
  }

  /**
   * Execute the complete workflow
   */
  async executeWorkflow(assets?: File[], manualFileNames?: Record<string, Record<string, string>>): Promise<{
    characterData: Partial<CharacterData>
    lorebook: LorebookEntry[]
    assetResults: AssetRenameResult[]
    stages: WorkflowStage[]
  }> {
    try {
      // Stage 1: Character Generation
      await this.executeStage1()
      
      // Stage 2: Lorebook Generation
      await this.executeStage2()
      
      // Stage 3: Asset Processing (if assets provided)
      if (assets && assets.length > 0) {
        await this.executeStage3(assets, manualFileNames)
      } else {
        this.markStageCompleted(3, { message: 'No assets provided - skipped' })
      }
      
      // Stage 4 is handled separately via user requests
      this.markStageCompleted(4, { message: 'Ready for modification requests' })
      
      // Stage 5: Final Output
      await this.executeStage5()
      
      return {
        characterData: this.characterData,
        lorebook: this.lorebook,
        assetResults: this.assetResults,
        stages: this.stages
      }
    } catch (error) {
      throw new Error(`Workflow execution failed: ${error}`)
    }
  }

  /**
   * Stage 1: Character Generation
   */
  async executeStage1(customPrompt?: string): Promise<void> {
    this.updateStageStatus(1, 'in_progress')
    
    try {
      // Validate API config first
      if (!this.config.apiConfig) {
        throw new Error('API configuration is missing')
      }
      
      if (!this.config.apiConfig.apiKey && this.config.apiConfig.provider !== 'ollama' && this.config.apiConfig.provider !== 'lm-studio') {
        throw new Error('API key is required for this provider')
      }
      
      const api = APIFactory.createAPI(this.config.apiConfig)
      
      const prompt = customPrompt ? this.processPromptTemplate(customPrompt, {
        characterInput: this.config.characterInput.additionalDetails || '',
        additionalDetails: this.config.characterInput.additionalDetails || ''
      }) : this.createStage1Prompt()
      const systemPrompt = `당신은 전문 캐릭터 디자이너입니다. 주어진 기본 설정을 바탕으로 매력적이고 일관성 있는 캐릭터의 기본 디스크립션을 생성해주세요.`
      
      const generationRequest: GenerationRequest = {
        prompt,
        config: this.config.apiConfig,
        systemPrompt
      }
      
      const response = await api.generateText(generationRequest)
      
      if (response.error) {
        throw new Error(`Stage 1 API Error: ${response.error}`)
      }
      
      if (!response.content) {
        throw new Error('Stage 1: No content received from API')
      }
      
      // Parse response and create basic character data
      const characterData = this.parseStage1Response(response.content)
      this.characterData = characterData
      
      this.markStageCompleted(1, characterData)
    } catch (error) {
      this.markStageFailed(1, [`Stage 1 failed: ${error}`])
      throw error
    }
  }

  /**
   * Stage 2: Lorebook Generation
   */
  async executeStage2(requirements?: string, customPrompt?: string): Promise<void> {
    this.updateStageStatus(2, 'in_progress')
    
    try {
      logger.info('Starting Stage 2 (Lorebook Generation)', {
        apiProvider: this.config.apiConfig.provider,
        apiModel: this.config.apiConfig.model,
        hasCharacterData: !!this.characterData && Object.keys(this.characterData).length > 0,
        characterName: this.characterData.name,
        requirements: requirements || 'none',
        hasCustomPrompt: !!customPrompt
      })
      
      const api = APIFactory.createAPI(this.config.apiConfig)
      
      const prompt = customPrompt ? this.processPromptTemplate(customPrompt, {
        characterName: this.characterData.name || '',
        characterDescription: this.characterData.description || '',
        characterPersonality: this.characterData.personality || '',
        characterScenario: this.characterData.scenario || '',
        requirements: requirements || ''
      }) : this.createStage2Prompt(requirements)
      
      logger.debug('Generated prompt for API', { promptLength: prompt.length })
      
      const systemPrompt = `당신은 세계관 설정 전문가입니다. 캐릭터에 특화된 로어책을 생성하여 풍부한 배경 설정을 제공해주세요.`
      
      const generationRequest: GenerationRequest = {
        prompt,
        config: this.config.apiConfig,
        systemPrompt
      }
      
      logger.info('Sending API request for lorebook generation')
      const response = await api.generateText(generationRequest)
      logger.info('Received API response', { 
        hasContent: !!response.content, 
        contentLength: response.content?.length || 0,
        hasError: !!response.error 
      })
      
      if (response.error) {
        logger.error('API Error in Stage 2', { error: response.error })
        throw new Error(`Stage 2 API Error: ${response.error}`)
      }
      
      if (!response.content) {
        logger.error('No content received from API')
        throw new Error('Stage 2: No content received from API')
      }
      
      logger.debug('Received raw API content', { contentPreview: response.content.substring(0, 200) })
      
      // Parse response and create lorebook entries
      const lorebook = this.parseStage2Response(response.content)
      logger.info('Successfully parsed lorebook entries', { count: lorebook.length })
      
      this.lorebook = lorebook
      
      this.markStageCompleted(2, { lorebookEntries: lorebook.length })
      logger.info('Stage 2 completed successfully', { entriesGenerated: lorebook.length })
    } catch (error) {
      logger.error('Stage 2 failed', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      })
      this.markStageFailed(2, [`Stage 2 failed: ${error}`])
      throw error
    }
  }

  /**
   * Stage 3: Asset Processing (Manual Mode)
   */
  async executeStage3(assets: File[], manualFileNames?: Record<string, Record<string, string>>): Promise<void> {
    this.updateStageStatus(3, 'in_progress')
    
    try {
      // Create asset results from manual filename mapping
      const assetResults: AssetRenameResult[] = []
      
      console.log('executeStage3 received manualFileNames:', JSON.stringify(manualFileNames, null, 2))
      
      // Check if manual file names are provided and have actual content
      const hasManualFileNames = manualFileNames && Object.keys(manualFileNames).some(category => 
        Object.keys(manualFileNames[category]).length > 0
      )
      
      console.log('hasManualFileNames:', hasManualFileNames)
      
      if (hasManualFileNames) {
        // Process each category with manual file names
        Object.entries(manualFileNames!).forEach(([category, fileMap]) => {
          Object.entries(fileMap).forEach(([originalName, newName]) => {
            const file = assets.find(f => f.name === originalName)
            if (file) {
              // Use newName if provided and not empty, otherwise use originalName
              const finalFileName = (newName && newName.trim()) ? newName.trim() : originalName
              
              // Create manual asset result
              const result: AssetRenameResult = {
                originalFileName: originalName,
                suggestedFileName: finalFileName,
                category: category as 'profile' | 'emotion' | 'adult' | 'etc',
                confidence: 1.0, // Manual selection = 100% confidence
                reasoning: 'User manually specified filename',
                extractedKeyword: finalFileName.replace(/\.[^/.]+$/, '') || originalName
              }
              assetResults.push(result)
            }
          })
        })
      } else {
        // Fallback: create basic results with original filenames
        assets.forEach(file => {
          const result: AssetRenameResult = {
            originalFileName: file.name,
            suggestedFileName: file.name,
            category: 'etc',
            confidence: 1.0,
            reasoning: 'Manual processing - original filename preserved',
            extractedKeyword: file.name.replace(/\.[^/.]+$/, '') || file.name
          }
          assetResults.push(result)
        })
      }
      
      console.log('Final assetResults before saving:', assetResults.map(r => ({
        original: r.originalFileName,
        suggested: r.suggestedFileName,
        category: r.category
      })))
      
      this.assetResults = assetResults
      
      // Register files with rename manager for download
      this.fileRenameManager.registerRenames(assets, assetResults)
      
      // Apply RISU dynamic asset integration to character data
      this.integrateRisuDynamicAssets(assetResults)
      
      // Generate summary
      const categories = assetResults.reduce((acc, result) => {
        acc[result.category] = (acc[result.category] || 0) + 1
        return acc
      }, {} as Record<string, number>)
      
      this.markStageCompleted(3, {
        totalAssets: assetResults.length,
        renamedAssets: assetResults.filter(r => r.originalFileName !== r.suggestedFileName).length,
        categories,
        warnings: []
      })
    } catch (error) {
      this.markStageFailed(3, [`Stage 3 failed: ${error}`])
      throw error
    }
  }

  /**
   * Integrate RISU dynamic assets into character data
   */
  private integrateRisuDynamicAssets(assetResults: AssetRenameResult[]): void {
    // Convert rename results to simple asset format (remove extensions)
    const emotionAssets: string[] = []
    const adultAssets: string[] = []
    const profileAssets: string[] = []
    const etcAssets: string[] = []

    assetResults.forEach(result => {
      // Remove extension from suggested filename for RISU
      let assetName = result.suggestedFileName || result.originalFileName
      
      // Safely remove extension if it exists
      const extensionMatch = assetName.match(/^(.+)(\.[^/.]+)$/)
      if (extensionMatch && extensionMatch[1]) {
        assetName = extensionMatch[1] // Use the name part without extension
      }
      
      // Ensure we don't have empty asset names
      if (!assetName || assetName.trim() === '') {
        // Fallback to original filename without extension
        const originalWithoutExt = result.originalFileName.replace(/\.[^/.]+$/, '')
        assetName = originalWithoutExt || result.originalFileName || `asset_${Date.now()}`
      }
      
      // Ensure asset name is valid (no empty strings)
      assetName = assetName.trim()
      if (!assetName) {
        assetName = `${result.category}_asset_${Date.now()}`
      }
      
      switch (result.category) {
        case 'emotion':
          emotionAssets.push(assetName)
          break
        case 'adult':
          adultAssets.push(assetName)
          break
        case 'profile':
          profileAssets.push(assetName)
          break
        default:
          etcAssets.push(assetName)
          break
      }
    })

    // Generate RISU dynamic asset extensions
    const risuExtensions = {
      risuai: {
        dynamicAssets: {
          enabled: true,
          assetList: [...emotionAssets, ...adultAssets, ...profileAssets, ...etcAssets],
          emotionAssets,
          adultAssets,
          profileAssets,
          etcAssets
        }
      }
    }

    // Generate simple post history instructions using RISU format
    let instructions = `# ${this.characterData.name} RISU 다이나믹 에셋 시스템\n\n`
    
    instructions += `## 이미지 사용법\n`
    instructions += `이미지를 표시할 때 <img src="에셋명"> 형식을 사용하세요.\n\n`
    
    if (emotionAssets.length > 0) {
      instructions += `## 감정 표현\n`
      instructions += `사용 가능한 감정: ${emotionAssets.join(', ')}\n`
      instructions += `예시: <img src="${emotionAssets[0]}">\n\n`
    }
    
    if (adultAssets.length > 0) {
      instructions += `## 성인 콘텐츠\n`
      instructions += `성인 이미지: ${adultAssets.join(', ')}\n`
      instructions += `예시: <img src="${adultAssets[0]}"> (적절한 상황에서만)\n\n`
    }
    
    if (profileAssets.length > 0) {
      instructions += `## 프로필/기본 이미지\n`
      instructions += `프로필 이미지: ${profileAssets.join(', ')}\n`
      instructions += `예시: <img src="${profileAssets[0]}">\n\n`
    }
    
    if (etcAssets.length > 0) {
      instructions += `## 기타 상황\n`
      instructions += `상황별 이미지: ${etcAssets.join(', ')}\n`
      instructions += `예시: <img src="${etcAssets[0]}">\n\n`
    }
    
    instructions += `## 사용 규칙\n`
    instructions += `1. 대화 상황에 맞는 적절한 이미지 선택\n`
    instructions += `2. 감정 변화 시 해당 감정 이미지 사용\n`
    instructions += `3. 성인 콘텐츠는 적절한 맥락에서만 사용\n`
    instructions += `4. RISU가 파일 확장자를 자동으로 처리하므로 에셋명만 사용\n`

    // Update character data with RISU extensions and instructions
    this.characterData.post_history_instructions = instructions
    
    if (!this.characterData.extensions) {
      this.characterData.extensions = {}
    }
    
    this.characterData.extensions = {
      ...this.characterData.extensions,
      ...risuExtensions
    }
  }

  /**
   * Stage 4: Handle Modification Request
   */
  async handleModificationRequest(request: ModificationRequest, customPrompt?: string): Promise<void> {
    this.updateStageStatus(4, 'in_progress')
    
    try {
      const api = APIFactory.createAPI(this.config.apiConfig)
      
      const prompt = customPrompt ? this.processPromptTemplate(customPrompt, {
        field: request.field,
        currentValue: request.currentValue,
        requestedChange: request.requestedChange,
        reason: request.reason,
        characterName: this.characterData.name || '',
        characterDescription: this.characterData.description || '',
        characterPersonality: this.characterData.personality || ''
      }) : this.createModificationPrompt(request)
      
      const systemPrompt = `당신은 캐릭터 수정 전문가입니다. 사용자의 수정 요청을 정확히 이해하고 일관성을 유지하면서 적절한 수정을 해주세요.`
      
      const generationRequest: GenerationRequest = {
        prompt,
        config: this.config.apiConfig,
        systemPrompt
      }
      
      const response = await api.generateText(generationRequest)
      
      if (response.error) {
        throw new Error(`Modification request failed: ${response.error}`)
      }
      
      // Apply modification
      const modifiedValue = this.parseModificationResponse(response.content, request)
      this.applyModification(request.field, modifiedValue)
      
      // Record modification
      this.modificationHistory.push(request)
      
      this.markStageCompleted(4, { 
        modificationsApplied: this.modificationHistory.length,
        latestModification: request.field
      })
    } catch (error) {
      this.markStageFailed(4, [`Modification failed: ${error}`])
      throw error
    }
  }

  /**
   * Stage 5: Final Output
   */
  async executeStage5(): Promise<void> {
    this.updateStageStatus(5, 'in_progress')
    
    try {
      // Finalize character data with all modifications
      const finalCharacterData = this.finalizeCharacterData()
      
      // Apply any final processing
      const finalResult = {
        characterData: finalCharacterData,
        lorebook: this.lorebook,
        assetResults: this.assetResults,
        modificationHistory: this.modificationHistory,
        metadata: {
          generatedAt: Date.now(),
          workflow: 'five-stage',
          version: '1.0'
        }
      }
      
      this.markStageCompleted(5, finalResult)
    } catch (error) {
      this.markStageFailed(5, [`Stage 5 failed: ${error}`])
      throw error
    }
  }

  /**
   * Create Stage 1 prompt
   */
  private createStage1Prompt(): string {
    const { characterInput } = this.config
    
    return `# 1단계: 캐릭터 기본 디스크립션 생성

다음 기본 설정을 바탕으로 캐릭터의 기본적인 디스크립션을 생성해주세요.

## 기본 설정
- **이름**: ${characterInput.name}
- **나이**: ${characterInput.age || '20-30대'}
- **성별**: ${characterInput.gender || '설정에 맞게'}
- **배경 설정**: ${characterInput.setting || 'modern'}
- **캐릭터 타입**: ${characterInput.characterType || 'single'}

${characterInput.additionalDetails ? `## 추가 요구사항\n${characterInput.additionalDetails}\n` : ''}

## 생성 요구사항
RISU 규격에 맞는 캐릭터 정보를 JSON 형식으로 생성해주세요.

**중요**: RISU에서는 personality와 scenario 필드를 비권장합니다. 모든 캐릭터 정보(외모, 성격, 배경, 현재 상황 등)를 description 필드에 통합하여 작성해주세요.

## 응답 형식
\`\`\`json
{
  "name": "${characterInput.name}",
  "description": "캐릭터의 종합적인 설명을 포함해주세요: 외모, 나이, 성별, 직업, 핵심 성격 특성, 생활 배경, 현재 상황, 특별한 특징 등을 자연스럽게 연결된 문장으로 작성 (300-400단어)",
  "first_mes": "캐릭터의 말투와 성격이 드러나는 자연스러운 첫 메시지 (50-100단어)",
  "mes_example": "캐릭터의 대화 스타일을 보여주는 예시 대화"
}
\`\`\`

간결하지만 매력적인 기본 캐릭터를 생성해주세요.`
  }

  /**
   * Create Stage 2 prompt
   */
  private createStage2Prompt(requirements?: string): string {
    let promptText = `# 2단계: 전용 로어북 생성

1단계에서 생성된 캐릭터 정보를 바탕으로 캐릭터에 특화된 로어북을 생성해주세요.

## 현재 캐릭터 정보
- **이름**: ${this.characterData.name}
- **캐릭터 설명**: ${this.characterData.description}`

    if (requirements && requirements.trim()) {
      promptText += `

## 사용자 특별 요구사항
${requirements.trim()}`
    }

    promptText += `

## 로어북 요구사항
다음 카테고리별로 로어북 엔트리를 생성해주세요:

1. **세계관 설정**: 캐릭터가 살고 있는 세계의 기본 규칙과 특징
2. **지역 정보**: 캐릭터의 거주지와 주요 활동 장소
3. **인물 관계**: 가족, 친구, 동료 등 주요 인물들
4. **문화/사회**: 해당 세계의 문화적 특징과 사회 구조
5. **특별 설정**: 캐릭터만의 독특한 설정이나 능력

## 응답 형식
**중요한 JSON 작성 규칙:**
- JSON 문자열 내부에서는 실제 줄바꿈 사용 금지 (대신 \\n 사용)
- 따옴표는 \\" 로 이스케이프 처리
- 올바른 JSON 형식 유지 (마지막 요소 뒤에 쉼표 없음)
- insertion_order는 숫자형으로 작성

**insertion_order 우선순위 가이드:**
- 1-10: 핵심 캐릭터 정보 (가장 높은 우선순위)
- 11-30: 세계관 설정
- 31-50: 지역 정보
- 51-70: 인물 관계
- 71-90: 문화/사회
- 91-100: 특별 설정

\`\`\`json
{
  "lorebook": [
    {
      "keys": ["키워드1", "키워드2", "키워드3"],
      "content": "상세한 설명 내용 (줄바꿈시 \\n 사용)",
      "name": "로어북 엔트리 제목",
      "comment": "로어북 엔트리에 대한 설명",
      "enabled": true,
      "insertion_order": "카테고리에 따른 적절한 우선순위 숫자",
      "constant": true,
      "selective": false,
      "case_sensitive": false,
      "use_regex": false,
      "extensions": {}
    }
  ]
}
\`\`\`

최소 5개 이상의 로어북 엔트리를 생성해주세요.`

    return promptText
  }

  /**
   * Process prompt template with variable substitution
   */
  private processPromptTemplate(template: string, variables: Record<string, string>): string {
    let processedTemplate = template
    
    // Replace {{variable}} with actual values
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g')
      processedTemplate = processedTemplate.replace(regex, value)
    })
    
    // Handle conditional blocks like {{#if requirements}}...{{/if}}
    processedTemplate = processedTemplate.replace(/\{\{#if\s+(\w+)\}\}(.*?)\{\{\/if\}\}/gs, (_, varName, content) => {
      const varValue = variables[varName]
      return (varValue && varValue.trim()) ? content : ''
    })
    
    return processedTemplate
  }

  /**
   * Create modification prompt
   */
  private createModificationPrompt(request: ModificationRequest): string {
    return `# 캐릭터 수정 요청 처리

사용자로부터 다음과 같은 수정 요청이 들어왔습니다.

## 수정 요청 정보
- **수정 대상**: ${request.field}
- **현재 값**: ${request.currentValue}
- **요청 내용**: ${request.requestedChange}
- **수정 이유**: ${request.reason}

## 현재 캐릭터 상태
${JSON.stringify(this.characterData, null, 2)}

## 수정 지침
1. 요청된 수정 내용을 정확히 반영
2. 다른 캐릭터 정보와의 일관성 유지
3. 캐릭터의 전체적인 매력과 개성 보존
4. 수정 사유가 타당한지 검토

## 응답 형식
\`\`\`json
{
  "modifiedValue": "수정된 새로운 값",
  "explanation": "수정 내용에 대한 설명",
  "consistencyCheck": "다른 정보와의 일관성 검토 결과"
}
\`\`\`

신중하게 수정을 진행해주세요.`
  }

  // Helper methods for parsing responses and managing stages
  private parseStage1Response(response: string): Partial<CharacterData> {
    try {
      const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/) || response.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('No JSON found')
      
      const parsed = JSON.parse(jsonMatch[1] || jsonMatch[0])
      return {
        name: parsed.name,
        description: parsed.description,
        first_mes: parsed.first_mes,
        mes_example: parsed.mes_example,
        creation_date: Date.now(),
        modification_date: Date.now()
      }
    } catch (error) {
      throw new Error(`Failed to parse Stage 1 response: ${error}`)
    }
  }

  private parseStage2Response(response: string): LorebookEntry[] {
    try {
      // Try multiple JSON extraction patterns
      let jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/)
      if (!jsonMatch) {
        jsonMatch = response.match(/```\s*([\s\S]*?)\s*```/)
      }
      if (!jsonMatch) {
        // Look for the first complete JSON object
        const startBrace = response.indexOf('{')
        if (startBrace !== -1) {
          let braceCount = 0
          let endBrace = startBrace
          for (let i = startBrace; i < response.length; i++) {
            if (response[i] === '{') braceCount++
            if (response[i] === '}') braceCount--
            if (braceCount === 0) {
              endBrace = i
              break
            }
          }
          if (braceCount === 0) {
            jsonMatch = [response.substring(startBrace, endBrace + 1), response.substring(startBrace, endBrace + 1)]
          }
        }
      }
      
      if (!jsonMatch) throw new Error('No JSON found')
      
      let jsonString = jsonMatch[1] || jsonMatch[0]
      
      // First try parsing as-is
      try {
        const parsed = JSON.parse(jsonString)
        return parsed.lorebook || []
      } catch (firstError) {
        console.log('First JSON parse failed, trying cleanup...')
        
        // Fix actual newlines inside JSON string values
        jsonString = this.fixJsonStringNewlines(jsonString)
        
        // Additional cleanup
        jsonString = jsonString
          .replace(/[\u0000-\u001F\u007F]+/g, ' ') // Remove control characters
          .replace(/,(\s*[}\]])/g, '$1') // Fix trailing commas
          .trim()
        
        const parsed = JSON.parse(jsonString)
        return parsed.lorebook || []
      }
    } catch (error) {
      console.error('Raw Stage 2 response:', response)
      console.error('JSON parsing failed:', error)
      
      // Fallback: try to extract basic lorebook structure from text
      try {
        const fallbackEntries = this.extractLorebookFromText(response)
        if (fallbackEntries.length > 0) {
          console.warn('Using fallback lorebook extraction')
          return fallbackEntries
        }
      } catch (fallbackError) {
        console.error('Fallback extraction also failed:', fallbackError)
      }
      
      throw new Error(`Failed to parse Stage 2 response: ${error}`)
    }
  }
  
  private extractLorebookFromText(text: string): LorebookEntry[] {
    const entries: LorebookEntry[] = []
    
    // Try to find basic content sections in the text
    const sections = text.split(/\n\s*\n/).filter(section => section.trim().length > 50)
    
    sections.forEach((section, index) => {
      const lines = section.trim().split('\n')
      const firstLine = lines[0].trim()
      
      // Use first line as title/key, rest as content
      const title = firstLine.replace(/[#*-]/g, '').trim() || `로어북 엔트리 ${index + 1}`
      const content = section.trim()
      
      // Determine insertion_order based on content analysis
      const insertionOrder = this.determineInsertionOrder(title, content)
      
      entries.push({
        keys: [title],
        content: content,
        name: title,
        comment: `자동 추출된 로어북 엔트리: ${title}`,
        enabled: true,
        insertion_order: insertionOrder,
        constant: true,
        selective: false,
        case_sensitive: false,
        use_regex: false,
        extensions: {}
      })
    })
    
    return entries
  }
  
  private fixJsonStringNewlines(jsonString: string): string {
    // This function fixes actual newlines inside JSON string values
    let result = ''
    let inString = false
    let escapeNext = false
    
    for (let i = 0; i < jsonString.length; i++) {
      const char = jsonString[i]
      
      if (escapeNext) {
        result += char
        escapeNext = false
        continue
      }
      
      if (char === '\\') {
        result += char
        escapeNext = true
        continue
      }
      
      if (char === '"') {
        inString = !inString
        result += char
        continue
      }
      
      if (inString) {
        if (char === '\n') {
          result += '\\n'
        } else if (char === '\r') {
          result += '\\r'
        } else if (char === '\t') {
          result += '\\t'
        } else {
          result += char
        }
      } else {
        result += char
      }
    }
    
    return result
  }
  
  private determineInsertionOrder(title: string, content: string): number {
    const titleLower = title.toLowerCase()
    const contentLower = content.toLowerCase()
    
    // 핵심 캐릭터 정보 (1-10)
    if (titleLower.includes('캐릭터') || titleLower.includes('프로필') || titleLower.includes('profile') ||
        contentLower.includes('이름:') || contentLower.includes('나이:') || contentLower.includes('성별:')) {
      return 5
    }
    
    // 세계관 설정 (11-30)
    if (titleLower.includes('세계') || titleLower.includes('world') || titleLower.includes('설정') || 
        contentLower.includes('세계관') || contentLower.includes('배경 설정')) {
      return 20
    }
    
    // 지역 정보 (31-50)
    if (titleLower.includes('지역') || titleLower.includes('장소') || titleLower.includes('도시') ||
        contentLower.includes('위치') || contentLower.includes('거주지')) {
      return 40
    }
    
    // 인물 관계 (51-70)
    if (titleLower.includes('인물') || titleLower.includes('관계') || titleLower.includes('가족') ||
        contentLower.includes('친구') || contentLower.includes('동료')) {
      return 60
    }
    
    // 문화/사회 (71-90)
    if (titleLower.includes('문화') || titleLower.includes('사회') || titleLower.includes('전통') ||
        contentLower.includes('관습') || contentLower.includes('규칙')) {
      return 80
    }
    
    // 특별 설정 (91-100)
    if (titleLower.includes('능력') || titleLower.includes('마법') || titleLower.includes('특별') ||
        contentLower.includes('특수') || contentLower.includes('독특한')) {
      return 95
    }
    
    // 기본값 (중간 우선순위)
    return 50
  }

  private parseModificationResponse(response: string, request: ModificationRequest): string {
    try {
      const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/) || response.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('No JSON found')
      
      const parsed = JSON.parse(jsonMatch[1] || jsonMatch[0])
      return parsed.modifiedValue || request.currentValue
    } catch (error) {
      console.warn('Failed to parse modification response, using requested change directly')
      return request.requestedChange
    }
  }

  private applyModification(field: string, value: string): void {
    (this.characterData as any)[field] = value
    this.characterData.modification_date = Date.now()
  }

  private finalizeCharacterData(): Partial<CharacterData> {
    return {
      ...this.characterData,
      modification_date: Date.now(),
      extensions: {
        fiveStageWorkflow: {
          modificationHistory: this.modificationHistory,
          lorebook: this.lorebook,
          assetSummary: {
            totalAssets: this.assetResults.length,
            categories: this.assetResults.reduce((acc, result) => {
              acc[result.category] = (acc[result.category] || 0) + 1
              return acc
            }, {} as Record<string, number>)
          },
          renamedAssets: this.fileRenameManager.exportForCharacterCard()
        }
      }
    }
  }

  private updateStageStatus(stageId: number, status: WorkflowStage['status']): void {
    const stage = this.stages.find(s => s.id === stageId)
    if (stage) {
      stage.status = status
    }
  }

  private markStageCompleted(stageId: number, result?: any): void {
    const stage = this.stages.find(s => s.id === stageId)
    if (stage) {
      stage.status = 'completed'
      stage.result = result
    }
  }

  private markStageFailed(stageId: number, errors: string[]): void {
    const stage = this.stages.find(s => s.id === stageId)
    if (stage) {
      stage.status = 'failed'
      stage.errors = errors
    }
  }

  // Public getters
  getStages(): WorkflowStage[] {
    return this.stages
  }

  getCharacterData(): Partial<CharacterData> {
    return this.characterData
  }

  getLorebook(): LorebookEntry[] {
    return this.lorebook
  }

  getAssetResults(): AssetRenameResult[] {
    return this.assetResults
  }

  getModificationHistory(): ModificationRequest[] {
    return this.modificationHistory
  }

  getFileRenameManager(): FileRenameManager {
    return this.fileRenameManager
  }
}