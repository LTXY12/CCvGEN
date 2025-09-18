import type { APIConfig, AIResponse, GenerationRequest } from '@/types/api'

export abstract class BaseAIAPI {
  protected config: APIConfig

  constructor(config: APIConfig) {
    this.config = config
  }

  abstract generateText(request: GenerationRequest): Promise<AIResponse>
  
  protected async makeRequest(
    url: string, 
    body: any, 
    headers: Record<string, string> = {}
  ): Promise<Response> {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`)
    }

    return response
  }

  protected handleError(error: any): AIResponse {
    console.error(`${this.config.provider} API Error:`, error)
    console.error('Error details:', {
      message: error?.message,
      stack: error?.stack,
      status: error?.status,
      code: error?.code,
      type: error?.type,
      name: error?.name,
      cause: error?.cause
    })
    
    let errorMessage = 'Connection error'
    
    if (error.message) {
      errorMessage = error.message
    } else if (typeof error === 'string') {
      errorMessage = error
    }

    // Enhanced browser environment error handling
    if (error.name === 'TypeError' && (error.message.includes('fetch') || error.message.includes('Failed to fetch'))) {
      errorMessage = `네트워크 연결 실패: ${this.config.provider} API에 연결할 수 없습니다.

가능한 원인:
1. 인터넷 연결 문제
2. CORS 정책으로 인한 브라우저 차단 (가장 가능성 높음)
3. API 키가 잘못되었거나 만료됨
4. API 서비스 장애
5. 엔드포인트 URL 오류: ${this.config.endpoint || 'default'}

해결방법:
- 브라우저 환경에서는 CORS 프록시나 서버를 통한 요청이 필요할 수 있습니다.
- API 키와 엔드포인트 설정을 다시 확인해주세요.`
    } else if (error.name === 'AbortError' || errorMessage.includes('AbortError') || errorMessage.includes('timeout')) {
      errorMessage = '요청 시간 초과: API 응답이 너무 늦습니다. 잠시 후 다시 시도해주세요.'
    } else if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
      errorMessage = 'API 키 인증 실패: API 키가 유효하지 않습니다. 설정을 확인해주세요.'
    } else if (errorMessage.includes('404') || errorMessage.includes('Not Found')) {
      errorMessage = 'API 엔드포인트를 찾을 수 없습니다. 엔드포인트 URL을 확인해주세요.'
    } else if (errorMessage.includes('403') || errorMessage.includes('Forbidden')) {
      errorMessage = '접근 거부: API 키 권한을 확인하거나 계정 상태를 점검해주세요.'
    } else if (errorMessage.includes('429') || errorMessage.includes('Rate limit')) {
      errorMessage = '요청 한도 초과: 잠시 후 다시 시도해주세요.'
    } else if (errorMessage.includes('CORS') || errorMessage.includes('cors')) {
      errorMessage = 'CORS 오류: 브라우저에서 직접 API 요청이 차단되었습니다. 프록시 서버가 필요합니다.'
    } else if (errorMessage.includes('ERR_BLOCKED_BY_CLIENT')) {
      errorMessage = '클라이언트 차단: 광고 차단기나 보안 프로그램이 요청을 차단했습니다.'
    } else if (errorMessage.includes('ERR_NETWORK')) {
      errorMessage = '네트워크 오류: 인터넷 연결을 확인해주세요.'
    }
    
    return {
      content: '',
      error: errorMessage
    }
  }

  protected validateConfig(): void {
    if (!this.config.apiKey && this.config.provider !== 'ollama' && this.config.provider !== 'lm-studio') {
      throw new Error(`API key is required for ${this.config.provider}`)
    }
  }
}