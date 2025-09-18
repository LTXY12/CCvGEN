import React, { useState, useRef } from 'react'
import { useAppSettings } from '@/stores/app-store'
import { localStorageManager } from '@/utils/local-storage'

export const Settings: React.FC = () => {
  const {
    settings,
    setSettings,
    loadFromStorage,
    saveToStorage,
    exportData,
    importData
  } = useAppSettings()

  const [isExporting, setIsExporting] = useState(false)
  const [storageInfo, setStorageInfo] = useState(localStorageManager.getStorageInfo())
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSettingChange = (key: keyof typeof settings, value: any) => {
    setSettings({ [key]: value })
  }

  const handleExportData = () => {
    setIsExporting(true)
    try {
      const data = exportData()
      const blob = new Blob([data], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      
      const link = document.createElement('a')
      link.href = url
      link.download = `ccvgen-backup-${new Date().toISOString().split('T')[0]}.json`
      link.click()
      
      URL.revokeObjectURL(url)
      alert('데이터를 성공적으로 내보냈습니다.')
    } catch (error) {
      alert('데이터 내보내기 중 오류가 발생했습니다.')
    } finally {
      setIsExporting(false)
    }
  }

  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const success = importData(e.target?.result as string)
        if (success) {
          alert('데이터를 성공적으로 불러왔습니다.')
          setStorageInfo(localStorageManager.getStorageInfo())
        } else {
          alert('데이터 불러오기에 실패했습니다.')
        }
      } catch (error) {
        alert('파일을 읽는 중 오류가 발생했습니다.')
      }
    }
    reader.readAsText(file)
    
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleClearData = () => {
    if (confirm('모든 저장된 데이터를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      localStorageManager.clearAllData()
      loadFromStorage()
      setStorageInfo(localStorageManager.getStorageInfo())
      alert('모든 데이터가 삭제되었습니다.')
    }
  }

  const handleRefreshStorage = () => {
    setStorageInfo(localStorageManager.getStorageInfo())
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <p style={{ margin: '0', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
          사용자 설정과 데이터를 관리합니다.
        </p>
      </div>

      <div className="config-form">
        <h3>기본 설정</h3>
        
        <div className="form-group">
          <label htmlFor="theme">테마</label>
          <select
            id="theme"
            value={settings.theme}
            onChange={(e) => handleSettingChange('theme', e.target.value)}
          >
            <option value="light">라이트 모드</option>
            <option value="dark">다크 모드</option>
          </select>
          <small className="form-help">애플리케이션의 색상 테마를 설정합니다.</small>
        </div>

        <div className="form-group">
          <label htmlFor="language">언어</label>
          <select
            id="language"
            value={settings.language}
            onChange={(e) => handleSettingChange('language', e.target.value)}
          >
            <option value="ko">한국어</option>
            <option value="en">English</option>
            <option value="ja">日本語</option>
          </select>
          <small className="form-help">사용자 인터페이스 언어를 설정합니다.</small>
        </div>

        <div className="form-group">
          <label>
            <input
              type="checkbox"
              checked={settings.autoSave}
              onChange={(e) => handleSettingChange('autoSave', e.target.checked)}
            />
            자동 저장
          </label>
          <small className="form-help">입력 내용을 자동으로 로컬 스토리지에 저장합니다.</small>
        </div>

        <div className="form-group">
          <label>
            <input
              type="checkbox"
              checked={settings.enablePromptEditing}
              onChange={(e) => handleSettingChange('enablePromptEditing', e.target.checked)}
            />
            프롬프트 편집 허용
          </label>
          <small className="form-help">생성된 프롬프트를 수정할 수 있는 기능을 활성화합니다.</small>
        </div>
      </div>

      <div className="config-list">
        <h3>저장소 정보</h3>
        
        <div className="analysis-stats">
          <div className="stat-card">
            <h4>사용량</h4>
            <span className="stat-number">{formatBytes(storageInfo.used)}</span>
          </div>
          <div className="stat-card">
            <h4>전체</h4>
            <span className="stat-number">{formatBytes(storageInfo.available)}</span>
          </div>
          <div className="stat-card">
            <h4>사용률</h4>
            <span className="stat-number">{storageInfo.percentage.toFixed(1)}%</span>
          </div>
          <div className="stat-card">
            <h4>상태</h4>
            <span className="stat-number">
              {storageInfo.percentage > 80 ? '⚠️ 높음' : storageInfo.percentage > 60 ? '📊 보통' : '✅ 양호'}
            </span>
          </div>
        </div>
        
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ 
            height: '8px', 
            backgroundColor: 'var(--bg-tertiary)', 
            borderRadius: '4px', 
            overflow: 'hidden',
            marginBottom: '1rem'
          }}>
            <div 
              style={{ 
                height: '100%',
                width: `${Math.min(storageInfo.percentage, 100)}%`,
                backgroundColor: storageInfo.percentage > 80 ? '#e74c3c' : storageInfo.percentage > 60 ? '#f39c12' : '#27ae60',
                transition: 'width 0.3s ease'
              }}
            />
          </div>
          
          <button 
            onClick={handleRefreshStorage} 
            className="btn btn-secondary btn-sm"
          >
            새로고침
          </button>
        </div>
      </div>

      <div className="config-form">
        <h3>데이터 백업 및 복원</h3>
        
        <div className="form-group">
          <label>데이터 내보내기</label>
          <button 
            onClick={handleExportData}
            disabled={isExporting}
            className="btn btn-primary"
          >
            {isExporting ? '내보내는 중...' : '데이터 내보내기'}
          </button>
          <small className="form-help">API 설정, 프롬프트 템플릿, 사용자 설정을 JSON 파일로 저장합니다.</small>
        </div>

        <div className="form-group">
          <label>데이터 가져오기</label>
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="btn btn-secondary"
          >
            데이터 가져오기
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImportData}
            style={{ display: 'none' }}
          />
          <small className="form-help">백업된 JSON 파일을 선택하여 설정을 복원합니다.</small>
        </div>
      </div>

      <div className="config-list">
        <h3>고급 설정</h3>
        
        <div className="api-cards">
          <div className="api-card">
            <div className="api-card-header">
              <h4>수동 저장</h4>
            </div>
            <div className="api-card-details">
              <p>현재 설정을 강제로 저장합니다.</p>
            </div>
            <button onClick={saveToStorage} className="btn btn-secondary">
              저장하기
            </button>
          </div>

          <div className="api-card">
            <div className="api-card-header">
              <h4>설정 다시 불러오기</h4>
            </div>
            <div className="api-card-details">
              <p>저장된 설정을 다시 불러옵니다.</p>
            </div>
            <button onClick={loadFromStorage} className="btn btn-secondary">
              다시 불러오기
            </button>
          </div>

          <div className="api-card">
            <div className="api-card-header">
              <h4>모든 데이터 삭제</h4>
            </div>
            <div className="api-card-details">
              <p>저장된 모든 설정과 데이터를 완전히 삭제합니다.</p>
            </div>
            <button 
              onClick={handleClearData} 
              className="btn btn-danger"
            >
              삭제하기
            </button>
          </div>
        </div>
      </div>

      <div className="config-list">
        <h3>애플리케이션 정보</h3>
        
        <div className="analysis-stats">
          <div className="stat-card">
            <h4>버전</h4>
            <span className="stat-number">v1.0.0</span>
          </div>
          <div className="stat-card">
            <h4>빌드 날짜</h4>
            <span className="stat-number">{new Date().toLocaleDateString()}</span>
          </div>
          <div className="stat-card">
            <h4>브라우저 지원</h4>
            <span className="stat-number">
              {typeof Storage !== "undefined" ? '✅ 지원' : '❌ 미지원'}
            </span>
          </div>
        </div>

        <div style={{ marginTop: '1.5rem' }}>
          <h4 style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>주요 기능</h4>
          <div style={{ 
            display: 'flex', 
            flexWrap: 'wrap', 
            gap: '0.5rem' 
          }}>
            <span className="tag">API 설정</span>
            <span className="tag">프롬프트 편집</span>
            <span className="tag">자동 저장</span>
            <span className="tag">데이터 백업</span>
            <span className="tag">테마 지원</span>
            <span className="tag">다국어</span>
          </div>
        </div>
      </div>
    </div>
  )
}