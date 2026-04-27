import { useState } from 'react'

const STATUSES = [
  'Applied',
  'Phone Screen',
  'Interview',
  'Final Round',
  'Offer',
  'Rejected',
  'Withdrawn'
]

function getNextFollowUp(form) {
  const base = form.lastFollowUp || form.dateApplied
  if (!base || !form.followUpDays) return null
  const d = new Date(base)
  d.setDate(d.getDate() + Number(form.followUpDays))
  return d.toISOString().split('T')[0]
}

export default function ApplicationModal({ application, settings, onSave, onClose }) {
  const today = new Date().toISOString().split('T')[0]
  const defaultDays = settings?.defaultFollowUpDays || 7

  const [form, setForm] = useState({
    company: '',
    role: '',
    status: 'Applied',
    dateApplied: today,
    url: '',
    salaryRange: '',
    contactName: '',
    contactEmail: '',
    notes: '',
    followUpDays: defaultDays,
    lastFollowUp: '',
    recruiterName: '',
    recruiterEmail: '',
    ...application
  })

  function setField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.company.trim() || !form.role.trim()) return
    onSave(form)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{application?.id ? 'Edit Application' : 'Add Application'}</h2>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>

        <form className="modal-form" onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>Company *</label>
              <input
                value={form.company}
                onChange={(e) => setField('company', e.target.value)}
                placeholder="Acme Corp"
                required
              />
            </div>
            <div className="form-group">
              <label>Role *</label>
              <input
                value={form.role}
                onChange={(e) => setField('role', e.target.value)}
                placeholder="Software Engineer"
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Status</label>
              <select value={form.status} onChange={(e) => setField('status', e.target.value)}>
                {STATUSES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Date Applied</label>
              <input
                type="date"
                value={form.dateApplied}
                onChange={(e) => setField('dateApplied', e.target.value)}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Follow up after (days)</label>
              <input
                type="number"
                min="1"
                max="90"
                value={form.followUpDays}
                onChange={(e) => setField('followUpDays', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Last Followed Up</label>
              <input
                type="date"
                value={form.lastFollowUp}
                onChange={(e) => setField('lastFollowUp', e.target.value)}
              />
            </div>
          </div>

          <div className="followup-preview">
            <span className="followup-preview-label">Next follow-up:</span>
            <span className="followup-preview-date">
              {getNextFollowUp(form) ?? '—'}
            </span>
            <span className="followup-preview-hint">
              ({form.lastFollowUp ? 'last follow-up' : 'applied date'} + {form.followUpDays} days)
            </span>
          </div>

          <div className="form-group">
            <label>Application URL</label>
            <input
              type="url"
              value={form.url}
              onChange={(e) => setField('url', e.target.value)}
              placeholder="https://..."
            />
          </div>

          <div className="form-group">
            <label>Salary Range</label>
            <input
              value={form.salaryRange}
              onChange={(e) => setField('salaryRange', e.target.value)}
              placeholder="e.g. $80k–$100k"
            />
          </div>

          <div className="form-section-label">Contacts</div>

          <div className="form-row">
            <div className="form-group">
              <label>Recruiter Name</label>
              <input
                value={form.recruiterName}
                onChange={(e) => setField('recruiterName', e.target.value)}
                placeholder="John Doe"
              />
            </div>
            <div className="form-group">
              <label>Recruiter Email</label>
              <input
                type="email"
                value={form.recruiterEmail}
                onChange={(e) => setField('recruiterEmail', e.target.value)}
                placeholder="john@recruiter.com"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Hiring Manager Name</label>
              <input
                value={form.contactName}
                onChange={(e) => setField('contactName', e.target.value)}
                placeholder="Jane Smith"
              />
            </div>
            <div className="form-group">
              <label>Hiring Manager Email</label>
              <input
                type="email"
                value={form.contactEmail}
                onChange={(e) => setField('contactEmail', e.target.value)}
                placeholder="jane@company.com"
              />
            </div>
          </div>

          <div className="form-group">
            <label>Notes</label>
            <textarea
              rows={3}
              value={form.notes}
              onChange={(e) => setField('notes', e.target.value)}
              placeholder="Interview notes, recruiter info, next steps..."
            />
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
