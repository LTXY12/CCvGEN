import React from 'react'
import { Header } from './Header'

interface LayoutProps {
  children: React.ReactNode
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="app-layout">
      <Header />
      <main className="main-content">
        <div className="container">
          <div className="content-area">
            {children}
          </div>
        </div>
      </main>
    </div>
  )
}