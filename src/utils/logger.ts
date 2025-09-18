/**
 * Logger utility for debugging workflow issues
 * Saves logs to a downloadable file
 */

import { invoke } from '@tauri-apps/api/core'

export class Logger {
  private logs: string[] = []
  private startTime: number = Date.now()

  log(message: string, data?: any) {
    const timestamp = new Date().toLocaleString('ko-KR')
    const elapsed = Date.now() - this.startTime
    
    let logEntry = `[${timestamp}] [+${elapsed}ms] ${message}`
    
    if (data !== undefined) {
      if (typeof data === 'object') {
        logEntry += `\n  Data: ${JSON.stringify(data, null, 2)}`
      } else {
        logEntry += `\n  Data: ${data}`
      }
    }
    
    this.logs.push(logEntry)
    
    // Also log to console for immediate viewing if available
    try {
      console.log(`[Logger] ${message}`, data)
    } catch (e) {
      // Console not available, ignore
    }
  }

  error(message: string, error?: any) {
    const timestamp = new Date().toLocaleString('ko-KR')
    const elapsed = Date.now() - this.startTime
    
    let logEntry = `[${timestamp}] [+${elapsed}ms] ERROR: ${message}`
    
    if (error) {
      if (error instanceof Error) {
        logEntry += `\n  Error: ${error.message}`
        if (error.stack) {
          logEntry += `\n  Stack: ${error.stack}`
        }
      } else {
        logEntry += `\n  Error: ${JSON.stringify(error, null, 2)}`
      }
    }
    
    this.logs.push(logEntry)
    
    // Also log to console for immediate viewing if available
    try {
      console.error(`[Logger] ${message}`, error)
    } catch (e) {
      // Console not available, ignore
    }
  }

  info(message: string, data?: any) {
    this.log(`INFO: ${message}`, data)
  }

  warn(message: string, data?: any) {
    this.log(`WARN: ${message}`, data)
  }

  debug(message: string, data?: any) {
    this.log(`DEBUG: ${message}`, data)
  }

  getLogs(): string[] {
    return [...this.logs]
  }

  getLogsAsString(): string {
    return this.logs.join('\n\n')
  }

  clear() {
    this.logs = []
    this.startTime = Date.now()
  }

  /**
   * Download logs as a .log file (Cross-platform: Browser + Tauri)
   */
  async downloadLogs(filename?: string) {
    const logContent = this.getLogsAsString()
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const defaultFilename = `ccvgen-debug-${timestamp}.log`
    const finalFilename = filename || defaultFilename
    
    // Check if we're in Tauri environment
    const isTauri = (window as any).__TAURI__ !== undefined
    
    if (isTauri) {
      // Tauri environment - use simple invoke command
      try {
        const savedPath = await this.saveTauriFile(finalFilename, logContent)
        this.log(`Logs saved to: ${savedPath}`)
        return { success: true, path: savedPath }
      } catch (tauriError) {
        this.error('Tauri save failed, falling back to browser download', tauriError)
        // Fallback to browser download
        this.browserDownload(logContent, finalFilename)
        return { success: true, path: finalFilename, fallback: true }
      }
    } else {
      // Browser environment - use standard download
      this.browserDownload(logContent, finalFilename)
      return { success: true, path: finalFilename }
    }
  }

  /**
   * Use Tauri invoke to save file
   */
  private async saveTauriFile(filename: string, content: string): Promise<string> {
    if (typeof window !== 'undefined' && (window as any).__TAURI__) {
      return await invoke('save_text_file_simple', { filename, content })
    } else {
      throw new Error('Tauri invoke not available')
    }
  }

  /**
   * Browser download fallback
   */
  private browserDownload(content: string, filename: string) {
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    this.log(`Logs downloaded as: ${filename}`)
  }

  /**
   * Get a summary of the log session
   */
  getSummary() {
    const totalLogs = this.logs.length
    const errors = this.logs.filter(log => log.includes('ERROR:')).length
    const warnings = this.logs.filter(log => log.includes('WARN:')).length
    const elapsed = Date.now() - this.startTime
    
    return {
      totalLogs,
      errors,
      warnings,
      sessionDuration: elapsed,
      startTime: new Date(this.startTime).toLocaleString('ko-KR'),
      endTime: new Date().toLocaleString('ko-KR')
    }
  }
}

// Global logger instance
export const logger = new Logger()

// Add session start log
logger.info('CCvGEN Debug Session Started', {
  userAgent: navigator.userAgent,
  url: window.location.href,
  timestamp: new Date().toISOString()
})