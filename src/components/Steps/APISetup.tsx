import React, { useState } from 'react'
import { useAPIConfig } from '@/stores/app-store'
import type { APIConfig, AIProvider } from '@/types/api'

// Tauri dialog import
let tauriDialog: any = null
try {
  tauriDialog = window.__TAURI__?.dialog
} catch (e) {
  // Fallback for non-Tauri environment
}

export const APISetup: React.FC = () => {
  const { apiConfigs, selectedAPI, setAPIConfigs, setSelectedAPI } = useAPIConfig()
  const [newConfig, setNewConfig] = useState<APIConfig>({
    provider: 'openai',
    apiKey: '',
    endpoint: 'https://api.openai.com/v1',
    model: 'gpt-4.1',
    maxTokens: 4000,
    temperature: 0.7
  })
  const [isCustomModel, setIsCustomModel] = useState(false)
  const [customModelName, setCustomModelName] = useState('')
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteConfigId, setDeleteConfigId] = useState<string | null>(null)

  const providers: { value: AIProvider; label: string; models: string[] }[] = [
    {
      value: 'openai',
      label: 'OpenAI',
      models: ['gpt-4.1', 'gpt-4.1-mini', 'gpt-4.1-nano', 'gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo']
    },
    {
      value: 'claude',
      label: 'Anthropic Claude',
      models: ['claude-opus-4', 'claude-sonnet-4', 'claude-3.7-sonnet', 'claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022']
    },
    {
      value: 'gemini',
      label: 'Google Gemini',
      models: ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-2.0-pro-experimental']
    },
    {
      value: 'custom-openai',
      label: 'Custom OpenAI Compatible',
      models: ['custom-model']
    },
    {
      value: 'ollama',
      label: 'Ollama (Local)',
      models: ['llama3.3', 'llama3.2', 'qwen2.5', 'mistral', 'codellama', 'deepseek-coder']
    },
    {
      value: 'lm-studio',
      label: 'LM Studio (Local)',
      models: ['local-model']
    }
  ]

  const getDefaultEndpoint = (provider: AIProvider): string => {
    switch (provider) {
      case 'openai': return 'https://api.openai.com/v1'
      case 'claude': return 'https://api.anthropic.com/v1'
      case 'gemini': return 'https://generativelanguage.googleapis.com/v1'
      case 'custom-openai': return 'https://your-api-endpoint.com/v1'
      case 'ollama': return 'http://localhost:11434'
      case 'lm-studio': return 'http://localhost:1234/v1'
      default: return ''
    }
  }

  const handleProviderChange = (provider: AIProvider) => {
    const providerInfo = providers.find(p => p.value === provider)
    setNewConfig({
      ...newConfig,
      provider,
      endpoint: getDefaultEndpoint(provider),
      model: providerInfo?.models[0] || ''
    })
  }

  const handleAddConfig = () => {
    if (!newConfig.apiKey && newConfig.provider !== 'ollama' && newConfig.provider !== 'lm-studio') {
      alert('API 키를 입력해주세요.')
      return
    }

    const configWithId = { ...newConfig, id: Date.now().toString() }
    const updatedConfigs = [...apiConfigs, configWithId]
    setAPIConfigs(updatedConfigs)
    
    if (!selectedAPI) {
      setSelectedAPI(configWithId)
    }

    // Reset form
    setNewConfig({
      provider: 'openai',
      apiKey: '',
      endpoint: 'https://api.openai.com/v1',
      model: 'gpt-4.1',
      maxTokens: 4000,
      temperature: 0.7
    })
    setIsCustomModel(false)
    setCustomModelName('')

    alert('API 설정이 추가되었습니다.')
  }

  const handleSelectConfig = (config: APIConfig) => {
    setSelectedAPI(config)
  }

  const handleDeleteConfig = (configId: string) => {
    setDeleteConfigId(configId)
    setShowDeleteModal(true)
  }

  const confirmDelete = () => {
    if (deleteConfigId) {
      const updatedConfigs = apiConfigs.filter((config, index) => {
        // id가 있으면 id로 비교, 없으면 index로 비교
        const configIdentifier = (config as any).id || `${index}`
        return configIdentifier !== deleteConfigId
      })
      setAPIConfigs(updatedConfigs)

      // 선택된 API가 삭제된 경우 첫 번째 API를 선택하거나 null로 설정
      const selectedConfigId = (selectedAPI as any)?.id || '0'
      if (selectedConfigId === deleteConfigId) {
        setSelectedAPI(updatedConfigs.length > 0 ? updatedConfigs[0] : null)
      }

      setShowDeleteModal(false)
      setDeleteConfigId(null)
    }
  }

  const cancelDelete = () => {
    setShowDeleteModal(false)
    setDeleteConfigId(null)
  }

  const currentProviderModels = providers.find(p => p.value === newConfig.provider)?.models || []

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h2>API 설정</h2>
        <p style={{ margin: '0', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
          AI 모델을 사용하기 위한 API 설정을 관리합니다. 최소 하나의 API를 설정해야 캐릭터 생성이 가능합니다.
        </p>
      </div>

      {/* Current Configurations */}
      {apiConfigs.length > 0 && (
        <div className="config-list">
          <h3>등록된 API 목록</h3>
          <div className="api-cards">
            {apiConfigs.map((config, index) => {
              const configWithId = config as APIConfig & { id: string }
              const isSelected = selectedAPI && (selectedAPI as any).id === configWithId.id
              
              return (
                <div 
                  key={configWithId.id || index} 
                  className={`api-card ${isSelected ? 'selected' : ''}`}
                >
                  <div className="api-card-header">
                    <h4>
                      {providers.find(p => p.value === config.provider)?.label}
                      {isSelected && <span className="selected-badge">✓ 선택됨</span>}
                    </h4>
                    <div className="api-card-actions">
                      {!isSelected && (
                        <button 
                          onClick={() => handleSelectConfig(config)}
                          className="btn btn-sm btn-primary"
                        >
                          선택
                        </button>
                      )}
                      <button 
                        onClick={() => handleDeleteConfig(configWithId.id || `${index}`)}
                        className="btn btn-sm btn-danger"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                  <div className="api-card-details">
                    <p><strong>모델:</strong> {config.model}</p>
                    <p><strong>엔드포인트:</strong> {config.endpoint}</p>
                    <p><strong>최대 토큰:</strong> {config.maxTokens}</p>
                    <p><strong>Temperature:</strong> {config.temperature}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Add Configuration Form */}
      <div className="config-form">
        <h3>새 API 추가</h3>
        
        <div className="form-group">
          <label htmlFor="provider">AI 제공업체</label>
          <select
            id="provider"
            value={newConfig.provider}
            onChange={(e) => handleProviderChange(e.target.value as AIProvider)}
          >
            {providers.map(provider => (
              <option key={provider.value} value={provider.value}>
                {provider.label}
              </option>
            ))}
          </select>
          <small className="form-help">사용할 AI 제공업체를 선택하세요.</small>
        </div>

        {newConfig.provider !== 'ollama' && newConfig.provider !== 'lm-studio' && (
          <div className="form-group">
            <label htmlFor="apiKey">API 키</label>
            <input
              type="password"
              id="apiKey"
              value={newConfig.apiKey || ''}
              onChange={(e) => setNewConfig({ ...newConfig, apiKey: e.target.value })}
              placeholder="API 키를 입력하세요"
            />
            <small className="form-help">제공업체에서 발급받은 API 키를 입력하세요.</small>
          </div>
        )}

        <div className="form-group">
          <label htmlFor="endpoint">API 엔드포인트</label>
          <input
            type="url"
            id="endpoint"
            value={newConfig.endpoint || ''}
            onChange={(e) => setNewConfig({ ...newConfig, endpoint: e.target.value })}
            placeholder="API 엔드포인트 URL"
          />
          <small className="form-help">API 서버의 엔드포인트 URL입니다.</small>
        </div>

        <div className="form-group">
          <label htmlFor="model">모델</label>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
            <label style={{ fontSize: '0.9rem', cursor: 'pointer' }}>
              <input
                type="radio"
                name="modelType"
                checked={!isCustomModel}
                onChange={() => {
                  setIsCustomModel(false)
                  setNewConfig({ ...newConfig, model: currentProviderModels[0] || '' })
                }}
              />
              프리셋 모델
            </label>
            <label style={{ fontSize: '0.9rem', cursor: 'pointer' }}>
              <input
                type="radio"
                name="modelType"
                checked={isCustomModel}
                onChange={() => {
                  setIsCustomModel(true)
                  setNewConfig({ ...newConfig, model: customModelName })
                }}
              />
              직접 입력
            </label>
          </div>
          
          {!isCustomModel ? (
            <select
              id="model"
              value={newConfig.model || ''}
              onChange={(e) => setNewConfig({ ...newConfig, model: e.target.value })}
            >
              {currentProviderModels.map(model => (
                <option key={model} value={model}>
                  {model}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              id="customModel"
              value={customModelName}
              onChange={(e) => {
                setCustomModelName(e.target.value)
                setNewConfig({ ...newConfig, model: e.target.value })
              }}
              placeholder="모델명을 직접 입력하세요 (예: gpt-4-custom, claude-3-custom)"
            />
          )}
          <small className="form-help">
            {!isCustomModel 
              ? '사용할 AI 모델을 선택하세요.' 
              : '사용할 모델명을 직접 입력하세요. 정확한 모델명을 입력해야 합니다.'
            }
          </small>
        </div>

        <div className="form-group">
          <label htmlFor="maxTokens">최대 토큰 수</label>
          <input
            type="number"
            id="maxTokens"
            value={newConfig.maxTokens || 4000}
            onChange={(e) => setNewConfig({ ...newConfig, maxTokens: parseInt(e.target.value) })}
            min="100"
            max="128000"
          />
          <small className="form-help">응답의 최대 토큰 수를 설정하세요. (100-128000)</small>
        </div>

        <div className="form-group">
          <label htmlFor="temperature">Temperature</label>
          <input
            type="number"
            id="temperature"
            value={newConfig.temperature || 0.7}
            onChange={(e) => setNewConfig({ ...newConfig, temperature: parseFloat(e.target.value) })}
            min="0"
            max="2"
            step="0.1"
          />
          <small className="form-help">응답의 창의성을 조절합니다. (0.0: 일관성, 2.0: 창의성)</small>
        </div>

        <div className="form-actions">
          <button onClick={handleAddConfig} className="btn btn-primary">
            API 추가
          </button>
        </div>
      </div>

      {apiConfigs.length === 0 && (
        <div className="empty-state">
          <p>아직 설정된 API가 없습니다. 위의 폼을 사용하여 첫 번째 API를 설정해주세요.</p>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal-overlay" onClick={cancelDelete}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>API 설정 삭제</h3>
            </div>
            <div className="modal-body">
              <p>이 API 설정을 삭제하시겠습니까?</p>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                삭제된 설정은 복구할 수 없습니다.
              </p>
            </div>
            <div className="modal-footer">
              <button onClick={cancelDelete} className="btn btn-secondary">
                취소
              </button>
              <button onClick={confirmDelete} className="btn btn-danger">
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}