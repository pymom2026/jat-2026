import { useState } from 'react'
import axios from 'axios'

function SetupScreen({ user, onComplete, onLogout }) {
  const [mode, setMode] = useState(null) // 'create' | 'existing'
  const [sheetUrl, setSheetUrl] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  const handleCreate = async () => {
    setCreating(true)
    setError('')
    try {
      const r = await axios.post('/api/jobs/setup-sheet')
      onComplete(r.data.sheetId)
    } catch (err) {
      setError('Failed to create sheet. Make sure you granted Google Sheets access.')
      setCreating(false)
    }
  }

  const handleExisting = () => {
    const match = sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/)
    if (!match) {
      setError('Could not find Sheet ID in that URL. Paste the full Google Sheets URL.')
      return
    }
    onComplete(match[1])
  }

  return (
    <div className="setup-screen">
      <div className="setup-card">
        <div className="setup-logo">
          <svg viewBox="0 0 24 24" fill="none" width="40" height="40">
            <rect x="2" y="3" width="20" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
            <path d="M8 10h8M8 14h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>
        <h1>Job Application Tracker</h1>
        <p className="setup-welcome">Welcome, {user.name}! Let's set up your personal tracker.</p>
        <p className="setup-sub">Your data is stored in your own Google Sheet — we never store it on our servers.</p>

        {!mode && (
          <div className="setup-options">
            <button className="setup-option" onClick={handleCreate} disabled={creating}>
              <div className="setup-option-icon">✦</div>
              <div className="setup-option-text">
                <strong>Create a new sheet</strong>
                <span>We'll create a fresh Google Sheet in your Drive automatically</span>
              </div>
            </button>
            <button className="setup-option" onClick={() => setMode('existing')}>
              <div className="setup-option-icon">↗</div>
              <div className="setup-option-text">
                <strong>Use an existing sheet</strong>
                <span>Paste the URL of a Google Sheet you already have</span>
              </div>
            </button>
          </div>
        )}

        {creating && (
          <div className="setup-loading">Creating your Google Sheet...</div>
        )}

        {mode === 'existing' && (
          <div className="setup-existing">
            <label>Paste your Google Sheet URL</label>
            <input
              type="text"
              placeholder="https://docs.google.com/spreadsheets/d/..."
              value={sheetUrl}
              onChange={e => setSheetUrl(e.target.value)}
            />
            <div className="setup-existing-actions">
              <button className="btn-secondary" onClick={() => setMode(null)}>Back</button>
              <button className="btn-primary" onClick={handleExisting}>Continue</button>
            </div>
          </div>
        )}

        {error && <div className="setup-error">{error}</div>}

        <button className="setup-logout" onClick={onLogout}>Sign out</button>
      </div>
    </div>
  )
}

export default SetupScreen
