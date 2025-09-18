import React, { useEffect, useState } from 'react'
import { Layout } from './components/Layout/Layout'
import FiveStageWorkflowComponent from './components/Workflow/FiveStageWorkflow'
import { APISetup } from './components/Steps'
import { useAppSettings, useCharacterInput, useAPIConfig } from './stores/app-store'
import './styles/main.css'

type CurrentView = 'workflow-selection' | 'api-setup' | 'five-stage-workflow'

const App: React.FC = () => {
  const { loadFromStorage, settings } = useAppSettings()
  const characterInput = useCharacterInput()
  const { selectedAPI } = useAPIConfig()
  const [currentView, setCurrentView] = useState<CurrentView>('workflow-selection')

  useEffect(() => {
    // Load data from localStorage on app startup
    loadFromStorage()
  }, [loadFromStorage])

  useEffect(() => {
    // Apply theme when it changes
    document.documentElement.setAttribute('data-theme', settings.theme)
  }, [settings.theme])

  const renderContent = () => {
    switch (currentView) {
      case 'api-setup':
        return <APISetup />
      
      case 'five-stage-workflow':
        return (
          <FiveStageWorkflowComponent 
            characterInput={characterInput}
            onComplete={(result) => {
              console.log('5단계 워크플로우 완료:', result)
            }}
            onCharacterInputChange={(newInput) => {
              console.log('캐릭터 입력 변경:', newInput)
            }}
          />
        )
      
      case 'workflow-selection':
      default:
        return (
          <div className="workflow-selection">
            <div style={{ marginBottom: '2rem' }}>
              <h2>CCvGEN - RISU 캐릭터 카드 생성기</h2>
              <p style={{ margin: '0', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                AI를 활용하여 RISU 호환 캐릭터 카드를 생성합니다. 먼저 API를 설정한 후 워크플로우를 선택하세요.
              </p>
            </div>

            <div className="workflow-options">
              <div className="workflow-card">
                <div className="workflow-card-header">
                  <h3>API 설정</h3>
                  <span className={`status-badge ${selectedAPI ? 'configured' : 'not-configured'}`}>
                    {selectedAPI ? '✓ 설정됨' : '⚠ 설정 필요'}
                  </span>
                </div>
                <div className="workflow-card-content">
                  <p>AI 모델을 사용하기 위한 API 설정을 관리합니다.</p>
                  <ul>
                    <li>OpenAI, Claude, Gemini 등 지원</li>
                    <li>로컬 모델 (Ollama, LM Studio) 지원</li>
                    <li>커스텀 엔드포인트 설정 가능</li>
                  </ul>
                </div>
                <div className="workflow-card-actions">
                  <button 
                    onClick={() => setCurrentView('api-setup')}
                    className="btn btn-primary"
                  >
                    API 설정하기
                  </button>
                </div>
              </div>

              <div className="workflow-card">
                <div className="workflow-card-header">
                  <h3>Five Stage Workflow</h3>
                  <span className={`status-badge ${selectedAPI ? 'available' : 'disabled'}`}>
                    {selectedAPI ? '✓ 사용 가능' : '⚠ API 설정 필요'}
                  </span>
                </div>
                <div className="workflow-card-content">
                  <p>5단계로 구성된 체계적인 캐릭터 생성 워크플로우입니다.</p>
                  <ul>
                    <li>에셋 업로드 및 자동 분류</li>
                    <li>AI 기반 캐릭터 설정 생성</li>
                    <li>로어북 및 시나리오 작성</li>
                    <li>RISU 호환 CHARX 파일 생성</li>
                  </ul>
                </div>
                <div className="workflow-card-actions">
                  <button 
                    onClick={() => setCurrentView('five-stage-workflow')}
                    className="btn btn-primary"
                    disabled={!selectedAPI}
                  >
                    워크플로우 시작
                  </button>
                </div>
              </div>
            </div>

            {!selectedAPI && (
              <div className="alert alert-warning">
                <strong>주의:</strong> 캐릭터 생성을 시작하기 전에 먼저 API를 설정해주세요.
              </div>
            )}
          </div>
        )
    }
  }

  return (
    <Layout>
      {currentView !== 'workflow-selection' && (
        <div style={{ marginBottom: '1rem' }}>
          <button 
            onClick={() => setCurrentView('workflow-selection')}
            className="btn btn-secondary btn-sm"
          >
            ← 메인 화면으로 돌아가기
          </button>
        </div>
      )}
      {renderContent()}
    </Layout>
  )
}

export default App