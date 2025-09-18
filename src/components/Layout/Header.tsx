import React, { useState } from 'react'
import { useUIState, useAppSettings } from '@/stores/app-store'
import { Settings } from '@/components/Settings/Settings'

export const Header: React.FC = () => {
  const { theme, language } = useUIState()
  const { settings, setSettings } = useAppSettings()
  const [showSettings, setShowSettings] = useState(false)

  const toggleTheme = () => {
    setSettings({ theme: theme === 'light' ? 'dark' : 'light' })
  }

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSettings({ language: e.target.value as 'ko' | 'en' | 'ja' })
  }

  const getTitle = () => {
    switch (language) {
      case 'ko':
        return 'Risu AI 캐릭터 카드 생성기'
      case 'ja':
        return 'Risu AI キャラクターカード生成器'
      default:
        return 'Risu AI Character Card Generator'
    }
  }

  const getThemeButtonText = () => {
    switch (language) {
      case 'ko':
        return theme === 'light' ? '다크 모드' : '라이트 모드'
      case 'ja':
        return theme === 'light' ? 'ダークモード' : 'ライトモード'
      default:
        return theme === 'light' ? 'Dark Mode' : 'Light Mode'
    }
  }

  return (
    <header className="header">
      <div className="header-container">
        <div className="header-left">
          <h1 className="header-title">{getTitle()}</h1>
          <span className="header-version">v1.0.0</span>
        </div>
        
        <div className="header-right">
          <select 
            value={language} 
            onChange={handleLanguageChange}
            className="language-selector"
            aria-label="Language selection"
          >
            <option value="ko">한국어</option>
            <option value="en">English</option>
            <option value="ja">日本語</option>
          </select>
          
          <button 
            onClick={toggleTheme}
            className="theme-toggle"
            aria-label={getThemeButtonText()}
          >
            {theme === 'light' ? '🌙' : '☀️'}
            <span className="theme-text">{getThemeButtonText()}</span>
          </button>

          <button 
            onClick={() => setShowSettings(true)}
            className="settings-toggle"
            aria-label="설정"
          >
            ⚙️
            <span className="settings-text">설정</span>
          </button>
        </div>
      </div>

      {showSettings && (
        <div className="settings-modal-overlay" onClick={() => setShowSettings(false)}>
          <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
            <div className="settings-modal-header">
              <h2>설정</h2>
              <button 
                className="close-button"
                onClick={() => setShowSettings(false)}
                aria-label="설정 닫기"
              >
                ×
              </button>
            </div>
            <div className="settings-modal-content">
              <Settings />
            </div>
          </div>
        </div>
      )}
    </header>
  )
}