/**
 * Dynamic Asset Renamer for RISU AI
 * AI-powered filename analysis and automatic renaming for dynamic assets
 * 
 * Naming Conventions:
 * - Emotion assets: "감정-감정명" (e.g., "감정-기쁨", "감정-슬픔")
 * - Adult assets: "섹스-포지션명" (e.g., "섹스-미셔너리", "섹스-카우걸")
 */

import { APIFactory } from '@/api/api-factory'
import type { APIConfig, GenerationRequest } from '@/types/api'

export interface AssetRenameResult {
  originalFileName: string
  suggestedFileName: string
  category: 'emotion' | 'adult' | 'profile' | 'etc'
  confidence: number
  reasoning: string
  extractedKeyword: string
}

export interface AssetRenameConfig {
  apiConfig: APIConfig
  characterName?: string
  characterContext?: string
}

export class DynamicAssetRenamer {
  /**
   * Analyze and rename assets using AI
   */
  static async analyzeAndRenameAssets(
    files: File[], 
    config: AssetRenameConfig
  ): Promise<AssetRenameResult[]> {
    const results: AssetRenameResult[] = []
    
    for (const file of files) {
      try {
        const result = await this.analyzeAssetFile(file, config)
        results.push(result)
      } catch (error) {
        // Fallback result for errors
        results.push({
          originalFileName: file.name,
          suggestedFileName: file.name,
          category: 'etc',
          confidence: 0,
          reasoning: `분석 실패: ${error}`,
          extractedKeyword: ''
        })
      }
    }
    
    return results
  }

  /**
   * Analyze single asset file and suggest rename
   */
  private static async analyzeAssetFile(
    file: File, 
    config: AssetRenameConfig
  ): Promise<AssetRenameResult> {
    const originalFileName = file.name
    const fileNameWithoutExt = originalFileName.replace(/\.[^/.]+$/, '')
    
    // Create analysis prompt
    const analysisPrompt = this.createAnalysisPrompt(
      fileNameWithoutExt, 
      config.characterName, 
      config.characterContext
    )
    
    const api = APIFactory.createAPI(config.apiConfig)
    const generationRequest: GenerationRequest = {
      prompt: analysisPrompt,
      config: config.apiConfig,
      systemPrompt: this.createSystemPrompt()
    }

    const response = await api.generateText(generationRequest)
    
    if (response.error) {
      throw new Error(`AI analysis failed: ${response.error}`)
    }

    // Parse AI response
    return this.parseAnalysisResponse(response.content, originalFileName)
  }

  /**
   * Create analysis prompt for AI
   */
  private static createAnalysisPrompt(
    fileName: string, 
    characterName?: string, 
    characterContext?: string
  ): string {
    return `# 에셋 파일명 분석 및 카테고리 분류

다음 이미지 파일명을 분석하여 RISU AI의 다이나믹 에셋 시스템에 맞는 새로운 파일명을 제안해주세요.

## 분석 대상
**파일명**: ${fileName}
${characterName ? `**캐릭터명**: ${characterName}` : ''}
${characterContext ? `**캐릭터 배경**: ${characterContext}` : ''}

## 분류 규칙
1. **감정 에셋**: 표정, 감정 상태를 나타내는 이미지
   - 명명법: "감정-[감정명]"
   - 예시: "감정-기쁨", "감정-슬픔", "감정-분노", "감정-놀람", "감정-당황", "감정-웃음"

2. **성인 에셋**: 성적 내용이 포함된 이미지
   - 명명법: "섹스-[포지션명]" 
   - 예시: "섹스-미셔너리", "섹스-카우걸", "섹스-도기스타일"

3. **프로필 에셋**: 기본 캐릭터 이미지, 전신샷 등
   - 명명법: "프로필-[상황]"
   - 예시: "프로필-기본", "프로필-전신"

4. **기타 에셋**: 위에 해당하지 않는 상황별 이미지
   - 명명법: "상황-[상황명]"
   - 예시: "상황-요리", "상황-공부", "상황-운동"

## 분석 요소
- 파일명에서 추출 가능한 키워드
- 감정이나 표정을 나타내는 단어 (happy, sad, angry, smile, cry, laugh 등)
- 성인 콘텐츠를 나타내는 단어 (adult, nsfw, sex, nude 등)
- 상황이나 활동을 나타내는 단어
- 한국어, 영어, 일본어 키워드 모두 고려

## 응답 형식
다음 JSON 형식으로 정확히 응답해주세요:

\`\`\`json
{
  "category": "emotion|adult|profile|etc",
  "extractedKeyword": "파일명에서 추출한 핵심 키워드",
  "suggestedFileName": "새로 제안하는 파일명 (확장자 제외)",
  "confidence": 0-100,
  "reasoning": "분석 근거와 이유 설명"
}
\`\`\`

파일명을 신중히 분석하고 가장 적절한 카테고리와 한국어 파일명을 제안해주세요.`
  }

  /**
   * Create system prompt for AI
   */
  private static createSystemPrompt(): string {
    return `당신은 이미지 파일명을 분석하는 전문가입니다. 

핵심 원칙:
1. 파일명에서 핵심 의미를 정확히 추출
2. RISU AI 다이나믹 에셋 시스템의 명명 규칙 준수
3. 한국어로 명확하고 간결한 파일명 제안
4. 애매한 경우 보수적으로 판단 (성인 콘텐츠는 확실할 때만)

분석 시 고려사항:
- 영어, 일본어, 한국어 키워드 모두 인식
- 은어나 줄임말도 고려 (예: ahegao → 아헤가오)
- 감정 표현의 미묘한 차이 구분
- 문맥상 의미 파악

반드시 유효한 JSON 형식으로 응답하세요.`
  }

  /**
   * Parse AI analysis response
   */
  private static parseAnalysisResponse(
    response: string, 
    originalFileName: string
  ): AssetRenameResult {
    try {
      // Extract JSON from response
      const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/) || 
                       response.match(/\{[\s\S]*\}/)
      
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response')
      }

      const parsed = JSON.parse(jsonMatch[1] || jsonMatch[0])
      
      // Get original file extension
      const extension = originalFileName.split('.').pop() || 'png'
      
      return {
        originalFileName,
        suggestedFileName: `${parsed.suggestedFileName}.${extension}`,
        category: parsed.category || 'etc',
        confidence: Math.min(Math.max(parsed.confidence || 0, 0), 100),
        reasoning: parsed.reasoning || '',
        extractedKeyword: parsed.extractedKeyword || ''
      }
    } catch (error) {
      // Fallback parsing
      return this.createFallbackResult(originalFileName, response)
    }
  }

  /**
   * Create fallback result when parsing fails
   */
  private static createFallbackResult(
    originalFileName: string, 
    response: string
  ): AssetRenameResult {
    const fileNameWithoutExt = originalFileName.replace(/\.[^/.]+$/, '')
    const extension = originalFileName.split('.').pop() || 'png'
    
    // Simple keyword matching for fallback
    let category: 'emotion' | 'adult' | 'profile' | 'etc' = 'etc'
    let suggestedName = fileNameWithoutExt
    
    // Check for emotion keywords
    const emotionKeywords = ['happy', 'sad', 'angry', 'smile', 'cry', 'laugh', 'joy', 'fear', 'surprise', '기쁨', '슬픔', '분노', '웃음']
    if (emotionKeywords.some(keyword => fileNameWithoutExt.toLowerCase().includes(keyword))) {
      category = 'emotion'
      suggestedName = `감정-${fileNameWithoutExt}`
    }
    
    // Check for adult keywords
    const adultKeywords = ['adult', 'nsfw', 'sex', 'nude', '성인', '섹스']
    if (adultKeywords.some(keyword => fileNameWithoutExt.toLowerCase().includes(keyword))) {
      category = 'adult'
      suggestedName = `섹스-${fileNameWithoutExt}`
    }
    
    // Check for profile keywords
    const profileKeywords = ['profile', 'main', 'base', 'default', '프로필', '기본']
    if (profileKeywords.some(keyword => fileNameWithoutExt.toLowerCase().includes(keyword))) {
      category = 'profile'
      suggestedName = `프로필-${fileNameWithoutExt}`
    }

    return {
      originalFileName,
      suggestedFileName: `${suggestedName}.${extension}`,
      category,
      confidence: 30, // Low confidence for fallback
      reasoning: `AI 응답 파싱 실패로 인한 기본 분류. 응답: ${response.substring(0, 100)}...`,
      extractedKeyword: fileNameWithoutExt
    }
  }

  /**
   * Batch rename files based on analysis results
   */
  static async applyRenames(
    files: File[], 
    renameResults: AssetRenameResult[]
  ): Promise<File[]> {
    const renamedFiles: File[] = []
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const result = renameResults[i]
      
      if (result && result.suggestedFileName !== result.originalFileName) {
        // Create new File object with suggested name
        const renamedFile = new File([file], result.suggestedFileName, {
          type: file.type,
          lastModified: file.lastModified
        })
        renamedFiles.push(renamedFile)
      } else {
        renamedFiles.push(file)
      }
    }
    
    return renamedFiles
  }

  /**
   * Generate summary of rename operations
   */
  static generateRenameSummary(results: AssetRenameResult[]): {
    totalFiles: number
    renamedFiles: number
    categories: Record<string, number>
    lowConfidenceFiles: AssetRenameResult[]
    duplicateNames: string[]
  } {
    const categories: Record<string, number> = {}
    const lowConfidenceFiles: AssetRenameResult[] = []
    const nameCount: Record<string, number> = {}
    const duplicateNames: string[] = []
    
    let renamedCount = 0
    
    results.forEach(result => {
      // Count categories
      categories[result.category] = (categories[result.category] || 0) + 1
      
      // Check if renamed
      if (result.suggestedFileName !== result.originalFileName) {
        renamedCount++
      }
      
      // Check confidence
      if (result.confidence < 70) {
        lowConfidenceFiles.push(result)
      }
      
      // Check for duplicates
      const nameWithoutExt = result.suggestedFileName.replace(/\.[^/.]+$/, '')
      nameCount[nameWithoutExt] = (nameCount[nameWithoutExt] || 0) + 1
      if (nameCount[nameWithoutExt] > 1 && !duplicateNames.includes(nameWithoutExt)) {
        duplicateNames.push(nameWithoutExt)
      }
    })
    
    return {
      totalFiles: results.length,
      renamedFiles: renamedCount,
      categories,
      lowConfidenceFiles,
      duplicateNames
    }
  }

  /**
   * Example usage for testing
   */
  static async exampleUsage(apiConfig: APIConfig): Promise<void> {
    // Mock files for testing
    const mockFiles = [
      new File([''], 'happy_smile.png', { type: 'image/png' }),
      new File([''], 'sad_crying.jpg', { type: 'image/jpeg' }),
      new File([''], 'adult_content.webp', { type: 'image/webp' }),
      new File([''], 'profile_main.png', { type: 'image/png' }),
      new File([''], 'cooking_scene.jpg', { type: 'image/jpeg' })
    ]
    
    const config: AssetRenameConfig = {
      apiConfig,
      characterName: '테스트 캐릭터',
      characterContext: '친근한 현대 도시 배경의 대학생 캐릭터'
    }
    
    try {
      console.log('에셋 파일명 분석 중...')
      const results = await this.analyzeAndRenameAssets(mockFiles, config)
      
      console.log('분석 결과:')
      results.forEach(result => {
        console.log(`${result.originalFileName} → ${result.suggestedFileName}`)
        console.log(`  카테고리: ${result.category} (신뢰도: ${result.confidence}%)`)
        console.log(`  이유: ${result.reasoning}`)
        console.log('')
      })
      
      const summary = this.generateRenameSummary(results)
      console.log('요약:')
      console.log(`총 파일: ${summary.totalFiles}, 변경됨: ${summary.renamedFiles}`)
      console.log('카테고리별:', summary.categories)
      
      if (summary.lowConfidenceFiles.length > 0) {
        console.log('낮은 신뢰도 파일들:', summary.lowConfidenceFiles.map(f => f.originalFileName))
      }
      
      if (summary.duplicateNames.length > 0) {
        console.log('중복 이름:', summary.duplicateNames)
      }
      
    } catch (error) {
      console.error('에셋 분석 실패:', error)
    }
  }
}