import { useState } from 'react'

export default function Settings({ settings, onSave, onDone }) {
  const [form, setForm] = useState({
    apiKey: settings.apiKey || '',
    defaultFollowUpDays: settings.defaultFollowUpDays ?? 7,
    notificationsEnabled: settings.notificationsEnabled !== false
  })
  const [saved, setSaved] = useState(false)
  const [showKey, setShowKey] = useState(false)

  function setField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSave(e) {
    e.preventDefault()
    await onSave(form)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="settings-page">
      <div className="settings-header">
        <h1>Settings</h1>
        {settings.apiKey && (
          <button className="btn-secondary" onClick={onDone}>
            ← Back to Dashboard
          </button>
        )}
      </div>

      {!settings.apiKey && (
        <div className="setup-banner">
          <strong>Welcome to Job Tracker!</strong> Add your Anthropic API key below to enable
          Claude AI features (import, assistant chat). Get your key at{' '}
          <a
            href="https://console.anthropic.com"
            target="_blank"
            rel="noreferrer"
            className="link"
          >
            console.anthropic.com
          </a>
        </div>
      )}

      <form className="settings-form" onSubmit={handleSave}>
        <div className="settings-section">
          <h2>Claude AI</h2>
          <div className="form-group">
            <label>Anthropic API Key</label>
            <div className="input-with-action">
              <input
                type={showKey ? 'text' : 'password'}
                value={form.apiKey}
                onChange={(e) => setField('apiKey', e.target.value)}
                placeholder="sk-ant-..."
                style={{ flex: 1 }}
              />
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowKey(!showKey)}
                style={{ whiteSpace: 'nowrap' }}
              >
                {showKey ? 'Hide' : 'Show'}
              </button>
            </div>
            <p className="form-hint">
              Your key is stored locally on your machine and never sent anywhere except Anthropic's
              API.
            </p>
          </div>
        </div>

        <div className="settings-section">
          <h2>Follow-up Defaults</h2>
          <div className="form-group">
            <label>Default follow-up interval (days)</label>
            <input
              type="number"
              min="1"
              max="90"
              value={form.defaultFollowUpDays}
              onChange={(e) => setField('defaultFollowUpDays', Number(e.target.value))}
              style={{ width: 100 }}
            />
            <p className="form-hint">
              When you add an application, the next follow-up date will be set to this many days
              after the applied date. You can override it per application.
            </p>
          </div>
        </div>

        <div className="settings-section">
          <h2>Notifications</h2>
          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={form.notificationsEnabled}
                onChange={(e) => setField('notificationsEnabled', e.target.checked)}
              />
              Enable Windows follow-up notifications
            </label>
            <p className="form-hint">
              You'll receive a desktop notification when an application's follow-up date arrives.
              The app checks every hour.
            </p>
          </div>
        </div>

        <button type="submit" className="btn-primary" style={{ alignSelf: 'flex-start' }}>
          {saved ? '✓ Saved!' : 'Save Settings'}
        </button>
      </form>
    </div>
  )
}
