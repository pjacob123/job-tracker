import { useState } from 'react'

export default function ImportModal({ settings, onImport, onClose }) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState(null)
  const [error, setError] = useState('')

  async function handleParse() {
    if (!text.trim()) return
    if (!settings.apiKey) {
      setError('No API key configured. Go to Settings first.')
      return
    }
    setLoading(true)
    setError('')

    const result = await window.api.claudeImport({ text })

    if (result.success) {
      setPreview(result.applications)
    } else {
      setError(result.error)
    }
    setLoading(false)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Import Tracker</h2>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>

        <div className="import-content">
          {!preview ? (
            <>
              <p className="import-hint">
                Paste your job tracker data from any source — a spreadsheet, doc, chat, or
                plain text. Claude will automatically extract and structure your applications.
              </p>
              <textarea
                className="import-textarea"
                placeholder="Paste your job tracker here — any format works...&#10;&#10;Example:&#10;- Google | Software Engineer | Applied 2024-01-15 | Status: Phone Screen&#10;- Meta | Product Manager | Applied 2024-01-10 | Rejected"
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={12}
              />
              {error && <div className="error-box">{error}</div>}
              <div className="modal-footer">
                <button className="btn-secondary" onClick={onClose}>
                  Cancel
                </button>
                <button
                  className="btn-primary"
                  onClick={handleParse}
                  disabled={loading || !text.trim()}
                >
                  {loading ? 'Parsing with Claude...' : 'Parse with Claude'}
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="import-hint">
                Found <strong>{preview.length}</strong> application{preview.length !== 1 ? 's' : ''}.
                Review below, then click Import All.
              </p>
              <div className="preview-list">
                {preview.map((app, i) => (
                  <div key={i} className="preview-item">
                    <span className="preview-company">{app.company}</span>
                    <span className="preview-sep">—</span>
                    <span>{app.role}</span>
                    <span className="preview-sep">—</span>
                    <span className="preview-status">{app.status}</span>
                    {app.dateApplied && (
                      <span className="preview-date">Applied {app.dateApplied}</span>
                    )}
                  </div>
                ))}
              </div>
              <div className="modal-footer">
                <button className="btn-secondary" onClick={() => setPreview(null)}>
                  Back
                </button>
                <button className="btn-primary" onClick={() => onImport(preview)}>
                  Import All
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
