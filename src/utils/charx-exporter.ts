import type { CharacterCardV3 } from '@/types/character-card'
import type { AssetAnalysis } from '@/types/api'

export interface CHARXExportOptions {
  characterCard: CharacterCardV3
  assets: File[]
  assetAnalyses?: AssetAnalysis[]
  includeMetadata?: boolean
  compressionLevel?: 'none' | 'fast' | 'best'
}

export interface CHARXExportResult {
  blob: Blob
  fileName: string
  fileSize: number
  metadata: {
    characterName: string
    assetCount: number
    exportTime: number
    compressionRatio: number
  }
}

/**
 * CHARX Exporter for Character Card V3 with assets
 * CHARX format is a ZIP file containing character.json and assets folder
 */
export class CHARXExporter {
  /**
   * Export character card and assets as CHARX file
   */
  static async exportToCHARX(options: CHARXExportOptions): Promise<CHARXExportResult> {
    const startTime = Date.now()
    
    // Dynamic import for JSZip to avoid bundle size issues
    const JSZip = await this.loadJSZip()
    const zip = new JSZip()
    
    // Add character data
    const characterData = this.prepareCharacterData(options.characterCard, options.assets, options.assetAnalyses)
    zip.file('card.json', JSON.stringify(characterData, null, 2))
    
    // Add assets according to SPEC_V3 structure: assets/{type}/images/
    let totalAssetSize = 0
    
    for (const asset of options.assets) {
      const assetData = await asset.arrayBuffer()
      totalAssetSize += assetData.byteLength
      
      // Determine asset type based on analysis or filename
      const assetType = this.determineAssetType(asset, options.assetAnalyses)
      const mediaCategory = this.getMediaCategory(asset.name)
      const storageDirectory = this.getStorageDirectory(assetType)
      
      // Create the proper directory structure: assets/{storageDir}/{mediaCategory}/
      const assetPath = `assets/${storageDirectory}/${mediaCategory}/${asset.name}`
      zip.file(assetPath, assetData)
    }
    
    // Risu AI CHARX format should only contain character.json and assets/
    // No additional metadata files that could cause import issues
    // 
    // Note: The metadata and analysis could be stored in character.data.extensions
    // if needed for compatibility without breaking the CHARX format
    
    // Generate ZIP file
    const compressionLevel = this.getCompressionLevel(options.compressionLevel)
    const zipBlob = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: {
        level: compressionLevel
      }
    })
    
    const fileName = this.generateFileName(options.characterCard.data.name)
    const compressionRatio = totalAssetSize > 0 ? zipBlob.size / totalAssetSize : 1
    
    return {
      blob: zipBlob,
      fileName,
      fileSize: zipBlob.size,
      metadata: {
        characterName: options.characterCard.data.name,
        assetCount: options.assets.length,
        exportTime: Date.now() - startTime,
        compressionRatio
      }
    }
  }
  
  /**
   * Dynamically load JSZip library
   */
  private static async loadJSZip(): Promise<any> {
    try {
      // Try to load JSZip dynamically
      const { default: JSZip } = await import('jszip')
      return JSZip
    } catch (error) {
      // Fallback: provide instructions for manual installation
      throw new Error(
        'JSZip library not found. Please install it with: npm install jszip @types/jszip'
      )
    }
  }
  
  /**
   * Prepare character data for CHARX format
   */
  private static prepareCharacterData(characterCard: CharacterCardV3, assets?: File[], assetAnalyses?: AssetAnalysis[]): any {
    // Risu AI expects exact Character Card V3 format without additional fields
    // Clean the data to remove any non-standard fields that might cause import issues
    const cleanData = {
      name: characterCard.data.name,
      description: characterCard.data.description,
      personality: characterCard.data.personality,
      scenario: characterCard.data.scenario,
      first_mes: characterCard.data.first_mes,
      mes_example: characterCard.data.mes_example,
      creator_notes: characterCard.data.creator_notes,
      system_prompt: characterCard.data.system_prompt,
      post_history_instructions: characterCard.data.post_history_instructions,
      alternate_greetings: characterCard.data.alternate_greetings,
      group_only_greetings: characterCard.data.group_only_greetings,
      character_book: characterCard.data.character_book,
      nickname: characterCard.data.nickname,
      creator_notes_multilingual: characterCard.data.creator_notes_multilingual,
      source: characterCard.data.source,
      creation_date: characterCard.data.creation_date,
      modification_date: characterCard.data.modification_date,
      extensions: characterCard.data.extensions,
      // Generate assets array with proper SPEC_V3 URIs
      assets: this.generateAssetsArray(assets, assetAnalyses)
    }
    
    return {
      spec: 'chara_card_v3',
      spec_version: '3.0',
      data: cleanData
    }
  }
  
  /**
   * Create metadata for CHARX file
   */
  private static createMetadata(options: CHARXExportOptions, totalAssetSize: number): any {
    return {
      format: 'charx',
      version: '1.0',
      character: {
        name: options.characterCard.data.name,
        creation_date: options.characterCard.data.creation_date,
        modification_date: options.characterCard.data.modification_date
      },
      assets: {
        count: options.assets.length,
        total_size: totalAssetSize,
        types: this.analyzeAssetTypes(options.assets)
      },
      export: {
        timestamp: new Date().toISOString(),
        generator: 'CCvGEN',
        compression: options.compressionLevel || 'fast'
      }
    }
  }
  
  /**
   * Analyze asset types for metadata
   */
  private static analyzeAssetTypes(assets: File[]): Record<string, number> {
    const types: Record<string, number> = {}
    
    assets.forEach(asset => {
      const extension = asset.name.split('.').pop()?.toLowerCase() || 'unknown'
      types[extension] = (types[extension] || 0) + 1
    })
    
    return types
  }
  
  /**
   * Get compression level number
   */
  private static getCompressionLevel(level?: string): number {
    switch (level) {
      case 'none': return 0
      case 'fast': return 1
      case 'best': return 9
      default: return 6 // default
    }
  }
  
  /**
   * Generate appropriate filename
   */
  private static generateFileName(characterName: string): string {
    const safeName = characterName
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .toLowerCase()
    
    const timestamp = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
    return `${safeName}_${timestamp}.charx`
  }
  
  /**
   * Extract character data from CHARX file
   */
  static async extractFromCHARX(charxFile: File): Promise<{
    characterCard: CharacterCardV3
    assets: File[]
    metadata?: any
    assetAnalysis?: any
  } | null> {
    try {
      const JSZip = await this.loadJSZip()
      const zip = await JSZip.loadAsync(charxFile)
      
      // Extract character data - try both card.json and character.json for compatibility
      let characterFile = zip.file('card.json')
      if (!characterFile) {
        characterFile = zip.file('character.json')
      }
      if (!characterFile) {
        throw new Error('Neither card.json nor character.json found in CHARX file')
      }
      
      const characterText = await characterFile.async('text')
      const characterData = JSON.parse(characterText)
      
      if (characterData.spec !== 'chara_card_v3') {
        throw new Error('Invalid character card format')
      }
      
      // Extract assets from SPEC_V3 directory structure
      const assets: File[] = []
      const assetsFolder = zip.folder('assets')
      
      if (assetsFolder) {
        const assetPromises: Promise<File>[] = []
        
        // Recursively traverse all asset folders (icon/, other/, etc.)
        this.traverseAssetsFolder(assetsFolder, '', assetPromises)
        
        assets.push(...await Promise.all(assetPromises))
      }
      
      // Extract metadata if available
      let metadata = undefined
      const metadataFile = zip.file('metadata.json')
      if (metadataFile) {
        const metadataText = await metadataFile.async('text')
        metadata = JSON.parse(metadataText)
      }
      
      // Extract asset analysis if available
      let assetAnalysis = undefined
      const analysisFile = zip.file('asset_analysis.json')
      if (analysisFile) {
        const analysisText = await analysisFile.async('text')
        assetAnalysis = JSON.parse(analysisText)
      }
      
      return {
        characterCard: characterData,
        assets,
        metadata,
        assetAnalysis
      }
      
    } catch (error) {
      console.error('Failed to extract CHARX file:', error)
      return null
    }
  }
  
  /**
   * Generate assets array for character card with proper SPEC_V3 URIs
   */
  private static generateAssetsArray(assets?: File[], assetAnalyses?: AssetAnalysis[]): any[] {
    if (!assets || assets.length === 0) {
      return []
    }
    
    return assets.map(asset => {
      const assetType = this.determineAssetType(asset, assetAnalyses)
      const mediaCategory = this.getMediaCategory(asset.name)
      const storageDirectory = this.getStorageDirectory(assetType)
      const extension = asset.name.split('.').pop()?.toLowerCase() || 'unknown'
      
      // Create the embedded URI with actual storage directory: embeded://assets/{storageDir}/{mediaCategory}/{filename}
      const uri = `embeded://assets/${storageDirectory}/${mediaCategory}/${asset.name}`
      
      // Determine name based on asset type and analysis (following Risu AI CHARX pattern)
      let name = 'main'
      const analysis = assetAnalyses?.find(a => a.fileName === asset.name)
      
      if (assetType === 'icon') {
        name = 'iconx'  // Standard name for profile icons in Risu AI
      } else if (assetType === 'x-risu-asset') {
        // For Risu assets, use actual asset name from analysis
        if (analysis && analysis.tags.length > 1) {
          name = analysis.tags[1] // Use second tag (actual asset name, tags[0] is category)
        } else {
          name = asset.name.split('.')[0] // Fallback to filename without extension
        }
      } else {
        name = asset.name.split('.')[0] // Default fallback
      }
      
      return {
        type: assetType,
        uri: uri,
        name: name,
        ext: extension
      }
    })
  }
  
  /**
   * Get storage directory for asset type in CHARX structure
   * Maps asset types to actual storage directories:
   * - icon → icon (프로필 이미지)
   * - x-risu-asset → other (감정, 성인용, 기타 이미지)
   */
  private static getStorageDirectory(assetType: string): string {
    switch (assetType) {
      case 'icon':
        return 'icon'
      case 'x-risu-asset':
        return 'other'
      default:
        return 'other'
    }
  }

  /**
   * Determine asset type based on analysis or filename
   * Maps our categories to Risu AI CHARX asset types:
   * - profile → icon (기본이미지)  
   * - emotion → x-risu-asset (감정)
   * - adult → x-risu-asset (성인용이미지)
   * - etc → x-risu-asset (기타)
   */
  private static determineAssetType(asset: File, assetAnalyses?: AssetAnalysis[]): string {
    // Try to find analysis for this asset
    const analysis = assetAnalyses?.find(a => a.fileName === asset.name)
    
    if (analysis) {
      // Map our internal categories to Risu AI CHARX types
      switch (analysis.category) {
        case 'profile':
          return 'icon'
        case 'emotion':
        case 'adult':
        case 'etc':
        default:
          return 'x-risu-asset'  // Risu AI specific asset type
      }
    }
    
    // Fallback: try to determine from filename
    const fileName = asset.name.toLowerCase()
    if (fileName.includes('profile') || fileName.includes('프로필') || 
        fileName.includes('avatar') || fileName.includes('main')) {
      return 'icon'
    }
    
    return 'x-risu-asset'
  }
  
  /**
   * Get media category for CHARX directory structure
   * Based on actual working CHARX files: uses singular 'image' not 'images'
   */
  private static getMediaCategory(fileName: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase()
    
    const imageExtensions = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'avif']
    const audioExtensions = ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a']
    const videoExtensions = ['mp4', 'webm', 'avi', 'mov', 'mkv']
    const aiExtensions = ['safetensors', 'ckpt', 'onnx', 'pt', 'bin']
    const fontExtensions = ['ttf', 'otf', 'woff', 'woff2']
    const codeExtensions = ['js', 'lua', 'py', 'json']
    
    if (extension && imageExtensions.includes(extension)) {
      return 'image'  // Singular form as used in actual CHARX files
    } else if (extension && audioExtensions.includes(extension)) {
      return 'audio'
    } else if (extension && videoExtensions.includes(extension)) {
      return 'video'
    } else if (extension && aiExtensions.includes(extension)) {
      return 'ai'
    } else if (extension && fontExtensions.includes(extension)) {
      return 'fonts'
    } else if (extension && codeExtensions.includes(extension)) {
      return 'code'
    } else {
      return 'other'
    }
  }
  
  /**
   * Count assets in folder recursively
   */
  private static countAssetsInFolder(folder: any, callback: (count: number) => void): void {
    folder.forEach((_relativePath: string, file: any) => {
      if (file.dir) {
        // It's a directory, count recursively
        this.countAssetsInFolder(file, callback)
      } else {
        // It's a file, count it
        callback(1)
      }
    })
  }

  /**
   * Recursively traverse assets folder to extract files from SPEC_V3 structure
   */
  private static traverseAssetsFolder(folder: any, pathPrefix: string, assetPromises: Promise<File>[]): void {
    folder.forEach((relativePath: string, file: any) => {
      if (file.dir) {
        // It's a directory, traverse recursively
        this.traverseAssetsFolder(file, pathPrefix + relativePath + '/', assetPromises)
      } else {
        // It's a file, extract just the filename (not the full path)
        const fileName = relativePath.split('/').pop() || relativePath
        assetPromises.push(
          file.async('uint8array').then((data: Uint8Array) => 
            new File([data], fileName, { 
              type: this.getMimeType(fileName) 
            })
          )
        )
      }
    })
  }
  
  /**
   * Get MIME type from file extension
   */
  private static getMimeType(fileName: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase()
    
    const mimeTypes: Record<string, string> = {
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'svg': 'image/svg+xml',
      'json': 'application/json',
      'txt': 'text/plain'
    }
    
    return mimeTypes[extension || ''] || 'application/octet-stream'
  }
  
  /**
   * Validate CHARX file structure
   */
  static async validateCHARX(charxFile: File): Promise<{
    isValid: boolean
    characterName?: string
    assetCount: number
    errors: string[]
  }> {
    const errors: string[] = []
    
    try {
      const JSZip = await this.loadJSZip()
      const zip = await JSZip.loadAsync(charxFile)
      
      // Check for required card.json or character.json
      let characterFile = zip.file('card.json')
      if (!characterFile) {
        characterFile = zip.file('character.json')
      }
      if (!characterFile) {
        errors.push('Required card.json or character.json file not found')
        return {
          isValid: false,
          assetCount: 0,
          errors
        }
      }
      
      // Validate character data
      try {
        const characterText = await characterFile.async('text')
        const characterData = JSON.parse(characterText)
        
        if (characterData.spec !== 'chara_card_v3') {
          errors.push('Invalid character card specification')
        }
        
        if (!characterData.data?.name) {
          errors.push('Character name is required')
        }
        
        // Count assets from SPEC_V3 structure
        let assetCount = 0
        const assetsFolder = zip.folder('assets')
        if (assetsFolder) {
          this.countAssetsInFolder(assetsFolder, (count) => { assetCount += count })
        }
        
        return {
          isValid: errors.length === 0,
          characterName: characterData.data?.name,
          assetCount,
          errors
        }
        
      } catch (parseError) {
        errors.push('Invalid card.json format')
        return {
          isValid: false,
          assetCount: 0,
          errors
        }
      }
      
    } catch (error) {
      errors.push('Failed to read CHARX file')
      return {
        isValid: false,
        assetCount: 0,
        errors
      }
    }
  }
  
  /**
   * Get CHARX file information without full extraction
   */
  static async getCHARXInfo(charxFile: File): Promise<{
    characterName: string
    assetCount: number
    fileSize: number
    hasMetadata: boolean
    hasAssetAnalysis: boolean
  } | null> {
    try {
      const JSZip = await this.loadJSZip()
      const zip = await JSZip.loadAsync(charxFile)
      
      let characterFile = zip.file('card.json')
      if (!characterFile) {
        characterFile = zip.file('character.json')
      }
      if (!characterFile) return null
      
      const characterText = await characterFile.async('text')
      const characterData = JSON.parse(characterText)
      
      let assetCount = 0
      const assetsFolder = zip.folder('assets')
      if (assetsFolder) {
        this.countAssetsInFolder(assetsFolder, (count) => { assetCount += count })
      }
      
      return {
        characterName: characterData.data?.name || 'Unknown',
        assetCount,
        fileSize: charxFile.size,
        hasMetadata: !!zip.file('metadata.json'),
        hasAssetAnalysis: !!zip.file('asset_analysis.json')
      }
      
    } catch (error) {
      console.error('Failed to get CHARX info:', error)
      return null
    }
  }
}