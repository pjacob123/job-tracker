import { useState, useEffect } from 'react'
import Dashboard from './components/Dashboard'
import ClaudePanel from './components/ClaudePanel'
import Settings from './components/Settings'

export default function App() {
  const [view, setView] = useState('dashboard')
  const [data, setData] = useState({ applications: [], settings: {} })
  const [claudeOpen, setClaudeOpen] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const d = await window.api.getData()
    setData(d)
    if (!d.settings.apiKey) setView('settings')
  }

  async function saveApplication(app) {
    const applications = await window.api.saveApplication(app)
    setData((prev) => ({ ...prev, applications }))
  }

  async function deleteApplication(id) {
    const applications = await window.api.deleteApplication(id)
    setData((prev) => ({ ...prev, applications }))
  }

  async function saveSettings(settings) {
    const saved = await window.api.saveSettings(settings)
    setData((prev) => ({ ...prev, settings: saved }))
  }

  return (
    <div className="app-container">
      <nav className="sidebar">
        <div className="sidebar-logo">
          <span className="logo-icon">💼</span>
          <span className="logo-text">Job Tracker</span>
        </div>
        <div className="sidebar-nav">
          <button
            className={`nav-item ${view === 'dashboard' ? 'active' : ''}`}
            onClick={() => setView('dashboard')}
          >
            📊 Dashboard
          </button>
          <button
            className={`nav-item ${view === 'settings' ? 'active' : ''}`}
            onClick={() => setView('settings')}
          >
            ⚙️ Settings
          </button>
        </div>
        <button className="claude-toggle" onClick={() => setClaudeOpen(!claudeOpen)}>
          {claudeOpen ? '✕ Close Claude' : '✨ Ask Claude'}
        </button>
      </nav>

      <main className="main-content">
        {view === 'dashboard' && (
          <Dashboard
            applications={data.applications}
            settings={data.settings}
            onSave={saveApplication}
            onDelete={deleteApplication}
          />
        )}
        {view === 'settings' && (
          <Settings
            settings={data.settings}
            onSave={saveSettings}
            onDone={() => setView('dashboard')}
          />
        )}
      </main>

      {claudeOpen && (
        <ClaudePanel settings={data.settings} onClose={() => setClaudeOpen(false)} />
      )}
    </div>
  )
}
