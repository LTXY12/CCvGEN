/**
 * File Rename Manager
 * Handles file renaming for download since browser cannot modify File objects directly
 */

import type { AssetRenameResult } from './dynamic-asset-renamer'

export interface RenamedFileInfo {
  originalFile: File
  newFileName: string
  category: string
  confidence: number
}

export class FileRenameManager {
  private fileMap: Map<string, RenamedFileInfo> = new Map()

  /**
   * Register files with their new names
   */
  registerRenames(files: File[], renameResults: AssetRenameResult[]): void {
    this.fileMap.clear()
    
    files.forEach((file, index) => {
      const result = renameResults[index]
      if (result) {
        this.fileMap.set(file.name, {
          originalFile: file,
          newFileName: result.suggestedFileName,
          category: result.category,
          confidence: result.confidence
        })
      }
    })
  }

  /**
   * Get renamed file info
   */
  getRenamedInfo(originalFileName: string): RenamedFileInfo | null {
    return this.fileMap.get(originalFileName) || null
  }

  /**
   * Get all renamed files
   */
  getAllRenamedFiles(): RenamedFileInfo[] {
    return Array.from(this.fileMap.values())
  }

  /**
   * Create blob URL for renamed file (for preview)
   */
  createRenamedBlobUrl(originalFileName: string): string | null {
    const info = this.fileMap.get(originalFileName)
    if (!info) return null
    
    return URL.createObjectURL(info.originalFile)
  }

  /**
   * Download single file with new name
   */
  downloadRenamedFile(originalFileName: string): void {
    const info = this.fileMap.get(originalFileName)
    if (!info) return

    const url = URL.createObjectURL(info.originalFile)
    const link = document.createElement('a')
    link.href = url
    link.download = info.newFileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  /**
   * Download all files with new names as ZIP
   */
  async downloadAllAsZip(): Promise<void> {
    // Dynamic import for JSZip
    const JSZip = (await import('jszip')).default
    const zip = new JSZip()

    // Add all renamed files to zip
    this.fileMap.forEach((info, originalName) => {
      zip.file(info.newFileName, info.originalFile)
    })

    // Generate and download zip
    const content = await zip.generateAsync({ type: 'blob' })
    const url = URL.createObjectURL(content)
    const link = document.createElement('a')
    link.href = url
    link.download = 'renamed-assets.zip'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  /**
   * Get rename summary
   */
  getRenameSummary(): {
    totalFiles: number
    renamedFiles: number
    categories: Record<string, number>
    highConfidenceFiles: number
    lowConfidenceFiles: number
  } {
    const categories: Record<string, number> = {}
    let renamedCount = 0
    let highConfidenceCount = 0
    let lowConfidenceCount = 0

    this.fileMap.forEach((info) => {
      // Count categories
      categories[info.category] = (categories[info.category] || 0) + 1
      
      // Count renamed files
      if (info.newFileName !== info.originalFile.name) {
        renamedCount++
      }
      
      // Count confidence levels
      if (info.confidence >= 80) {
        highConfidenceCount++
      } else if (info.confidence < 60) {
        lowConfidenceCount++
      }
    })

    return {
      totalFiles: this.fileMap.size,
      renamedFiles: renamedCount,
      categories,
      highConfidenceFiles: highConfidenceCount,
      lowConfidenceFiles: lowConfidenceCount
    }
  }

  /**
   * Export renamed files list for character card metadata
   */
  exportForCharacterCard(): {
    originalName: string
    risuName: string
    category: string
    confidence: number
  }[] {
    return Array.from(this.fileMap.values()).map(info => ({
      originalName: info.originalFile.name,
      risuName: info.newFileName,
      category: info.category,
      confidence: info.confidence
    }))
  }

  /**
   * Clear all registered files
   */
  clear(): void {
    this.fileMap.clear()
  }

  /**
   * Generate file mapping for CHARX export
   */
  generateCharxMapping(): Record<string, string> {
    const mapping: Record<string, string> = {}
    
    this.fileMap.forEach((info) => {
      // Map original file name to new name for CHARX structure
      mapping[info.originalFile.name] = info.newFileName
    })
    
    return mapping
  }

  /**
   * Create preview data for UI
   */
  createPreviewData(): Array<{
    original: string
    renamed: string
    category: string
    confidence: number
    confidenceLevel: 'high' | 'medium' | 'low'
    preview: string | null
  }> {
    return Array.from(this.fileMap.values()).map(info => {
      let confidenceLevel: 'high' | 'medium' | 'low' = 'medium'
      if (info.confidence >= 80) confidenceLevel = 'high'
      else if (info.confidence < 60) confidenceLevel = 'low'

      return {
        original: info.originalFile.name,
        renamed: info.newFileName,
        category: info.category,
        confidence: info.confidence,
        confidenceLevel,
        preview: this.createRenamedBlobUrl(info.originalFile.name)
      }
    })
  }
}