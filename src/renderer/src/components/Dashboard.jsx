import { useState } from 'react'
import ApplicationModal from './ApplicationModal'
import ImportModal from './ImportModal'

const STATUS_COLORS = {
  Applied: { bg: '#1e3a5f', text: '#60a5fa', border: '#2563eb' },
  'Phone Screen': { bg: '#3d2e0a', text: '#fbbf24', border: '#d97706' },
  Interview: { bg: '#3d1f0a', text: '#fb923c', border: '#ea580c' },
  'Final Round': { bg: '#2e1a5f', text: '#a78bfa', border: '#7c3aed' },
  Offer: { bg: '#0a3d1f', text: '#34d399', border: '#059669' },
  Rejected: { bg: '#3d0a0a', text: '#f87171', border: '#dc2626' },
  Withdrawn: { bg: '#1e2535', text: '#94a3b8', border: '#475569' }
}

const ALL_STATUSES = Object.keys(STATUS_COLORS)

function getNextFollowUp(app) {
  const base = app.lastFollowUp || app.dateApplied
  if (!base) return null
  const d = new Date(base)
  d.setDate(d.getDate() + (Number(app.followUpDays) || 7))
  return d.toISOString().split('T')[0]
}

export default function Dashboard({ applications, settings, onSave, onDelete }) {
  const [showModal, setShowModal] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [editingApp, setEditingApp] = useState(null)
  const [filter, setFilter] = useState('All')
  const [search, setSearch] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [sortCol, setSortCol] = useState(null)
  const [sortDir, setSortDir] = useState('asc')

  const today = new Date().toISOString().split('T')[0]

  const isFollowUpDue = (app) => {
    if (['Rejected', 'Withdrawn', 'Offer'].includes(app.status)) return false
    const next = getNextFollowUp(app)
    return next && next <= today
  }

  function handleSort(col) {
    if (sortCol === col) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortCol(col); setSortDir('asc') }
  }

  function sortValue(app, col) {
    if (col === 'nextFollowUp') return getNextFollowUp(app) ?? ''
    return (app[col] ?? '').toString().toLowerCase()
  }

  const filtered = applications
    .filter((app) => {
      if (filter !== 'All' && app.status !== filter) return false
      if (search && !`${app.company} ${app.role}`.toLowerCase().includes(search.toLowerCase()))
        return false
      return true
    })
    .sort((a, b) => {
      if (!sortCol) return 0
      const av = sortValue(a, sortCol)
      const bv = sortValue(b, sortCol)
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
    })

  const counts = ALL_STATUSES.reduce((acc, s) => {
    acc[s] = applications.filter((a) => a.status === s).length
    return acc
  }, {})
  const totalDueFollowUp = applications.filter(isFollowUpDue).length

  function handleEdit(app) {
    setEditingApp(app)
    setShowModal(true)
  }

  function handleAdd() {
    setEditingApp(null)
    setShowModal(true)
  }

  async function handleImport(apps) {
    for (const app of apps) {
      await onSave(app)
    }
    setShowImport(false)
  }

  async function handleDelete(id) {
    await onDelete(id)
    setConfirmDelete(null)
  }

  return (
    <div className="dashboard">
      {/* Stats */}
      <div className="stats-grid">
        <div
          className={`stat-card stat-card-clickable ${filter === 'All' ? 'stat-card-active' : ''}`}
          onClick={() => setFilter('All')}
        >
          <div className="stat-value">{applications.length}</div>
          <div className="stat-label">Total</div>
        </div>
        {ALL_STATUSES.map((s) => {
          const colors = STATUS_COLORS[s]
          const isActive = filter === s
          const isWarn = s === 'Applied' && totalDueFollowUp > 0
          return (
            <div
              key={s}
              className={`stat-card stat-card-clickable ${isActive ? 'stat-card-active' : ''}`}
              style={isActive ? { borderColor: colors.border, background: colors.bg } : {}}
              onClick={() => setFilter(isActive ? 'All' : s)}
            >
              <div className="stat-value" style={{ color: counts[s] > 0 ? colors.text : 'var(--text-muted)' }}>
                {counts[s]}
              </div>
              <div className="stat-label">{s}</div>
              {s === 'Applied' && totalDueFollowUp > 0 && (
                <div className="stat-followup-badge">{totalDueFollowUp} due</div>
              )}
            </div>
          )
        })}
      </div>

      {/* Toolbar */}
      <div className="toolbar">
        <input
          className="search-input"
          placeholder="Search company or role..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="filter-select"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="All">All Statuses</option>
          {ALL_STATUSES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <button className="btn-secondary" onClick={() => setShowImport(true)}>
          Import Tracker
        </button>
        <button className="btn-primary" onClick={handleAdd}>
          + Add Application
        </button>
      </div>

      {/* Table */}
      <div className="table-container">
        {filtered.length === 0 ? (
          <div className="empty-state">
            {applications.length === 0 ? (
              <>
                <div className="empty-icon">📋</div>
                <p>No applications yet.</p>
                <p className="empty-sub">Add one manually or import from your Claude chat.</p>
              </>
            ) : (
              <p>No applications match your search.</p>
            )}
          </div>
        ) : (
          <table className="app-table">
            <thead>
              <tr>
                {[
                  { label: 'Company', col: 'company' },
                  { label: 'Role', col: 'role' },
                  { label: 'Status', col: 'status' },
                  { label: 'Applied', col: 'dateApplied' },
                  { label: 'Next Follow-up', col: 'nextFollowUp' },
                  { label: 'Salary', col: 'salaryRange' }
                ].map(({ label, col }) => (
                  <th key={col} className="th-sortable" onClick={() => handleSort(col)}>
                    {label}
                    <span className="sort-indicator">
                      {sortCol === col ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ' ↕'}
                    </span>
                  </th>
                ))}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((app) => {
                const due = isFollowUpDue(app)
                const nextFollowUp = getNextFollowUp(app)
                const colors = STATUS_COLORS[app.status] || STATUS_COLORS['Withdrawn']
                return (
                  <tr key={app.id} className={due ? 'row-alert' : ''}>
                    <td className="td-company">
                      {app.url ? (
                        <a href={app.url} target="_blank" rel="noreferrer" className="company-link">
                          {app.company}
                        </a>
                      ) : (
                        app.company
                      )}
                    </td>
                    <td>{app.role}</td>
                    <td>
                      <select
                        className="status-select"
                        value={app.status}
                        style={{
                          background: colors.bg,
                          color: colors.text,
                          border: `1px solid ${colors.border}`
                        }}
                        onChange={(e) => onSave({ ...app, status: e.target.value })}
                      >
                        {ALL_STATUSES.map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                    </td>
                    <td className="td-muted">{app.dateApplied || '—'}</td>
                    <td className={due ? 'td-alert' : 'td-muted'}>
                      {due ? '⚠ ' : ''}{nextFollowUp || '—'}
                      {app.lastFollowUp && (
                        <span className="last-followup-hint"> (last: {app.lastFollowUp})</span>
                      )}
                    </td>
                    <td className="td-muted">{app.salaryRange || '—'}</td>
                    <td>
                      <div className="row-actions">
                        {!['Rejected', 'Withdrawn', 'Offer'].includes(app.status) && (
                          <button
                            className="btn-icon btn-followup"
                            title="Mark as followed up today"
                            onClick={() => onSave({ ...app, lastFollowUp: today })}
                          >
                            ✓ Followed Up
                          </button>
                        )}
                        <button className="btn-icon" onClick={() => handleEdit(app)}>
                          Edit
                        </button>
                        <button
                          className="btn-icon btn-danger"
                          onClick={() => setConfirmDelete(app.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Confirm delete */}
      {confirmDelete && (
        <div className="modal-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="modal modal-sm" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginBottom: 12 }}>Delete Application?</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: 20 }}>
              This cannot be undone.
            </p>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setConfirmDelete(null)}>
                Cancel
              </button>
              <button
                className="btn-primary"
                style={{ background: 'var(--danger)' }}
                onClick={() => handleDelete(confirmDelete)}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <ApplicationModal
          application={editingApp}
          settings={settings}
          onSave={(app) => {
            onSave(app)
            setShowModal(false)
          }}
          onClose={() => setShowModal(false)}
        />
      )}

      {showImport && (
        <ImportModal settings={settings} onImport={handleImport} onClose={() => setShowImport(false)} />
      )}
    </div>
  )
}
