import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import InterviewNotes from './InterviewNotes'

const STATUS_COLORS = {
  'Applied': '#6366f1',
  'In Review': '#f59e0b',
  'Interview': '#10b981',
  'Rejected': '#ef4444',
  'Leads': '#8b5cf6',
  'Referred': '#f59e0b',
  'Duplicate': '#9ca3af',
}

function RoleList({ jobs, onEdit, onDelete, onMarkDuplicate, onBulkDelete, onBulkDuplicate }) {
  const { company } = useParams()
  const navigate = useNavigate()
  const [expandedRow, setExpandedRow] = useState(null)
  const [selected, setSelected] = useState(new Set())
  const [bulkMode, setBulkMode] = useState(false)

  const companyName = decodeURIComponent(company)
  const roles = jobs.filter(j => j.company === companyName)
  const hasInterview = roles.some(j => j.status === 'Interview')

  const toggleSelect = (rowIndex) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(rowIndex) ? next.delete(rowIndex) : next.add(rowIndex)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selected.size === roles.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(roles.map(r => r.rowIndex)))
    }
  }

  const handleBulkDelete = () => {
    if (!confirm(`Delete ${selected.size} selected entries?`)) return
    onBulkDelete([...selected])
    setSelected(new Set())
    setBulkMode(false)
  }

  const handleBulkDuplicate = () => {
    if (!confirm(`Mark ${selected.size} selected entries as duplicate?`)) return
    onBulkDuplicate([...selected])
    setSelected(new Set())
    setBulkMode(false)
  }

  const cancelBulk = () => {
    setSelected(new Set())
    setBulkMode(false)
  }

  return (
    <div className="list-page">
      <div className="page-header">
        <button className="btn-back" onClick={() => navigate(-1)}>← Back</button>
        <div className="company-header">
          <div className="company-initial large">{companyName.charAt(0).toUpperCase()}</div>
          <h2>{companyName}</h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="count-badge">{roles.length} role{roles.length !== 1 ? 's' : ''}</span>
          {!bulkMode ? (
            <button
              className="btn-bulk"
              onClick={() => setBulkMode(true)}
              title="Select multiple to delete or mark duplicate"
            >
              Select
            </button>
          ) : (
            <button className="btn-bulk-cancel" onClick={cancelBulk}>Cancel</button>
          )}
        </div>
      </div>

      {bulkMode && (
        <div className="bulk-toolbar">
          <label className="bulk-select-all">
            <input
              type="checkbox"
              checked={selected.size === roles.length && roles.length > 0}
              onChange={toggleSelectAll}
            />
            Select all ({roles.length})
          </label>
          <div className="bulk-actions">
            <span className="bulk-count">{selected.size} selected</span>
            <button
              className="btn-bulk-duplicate"
              onClick={handleBulkDuplicate}
              disabled={selected.size === 0}
              title="Mark selected as duplicate"
            >
              Mark duplicate
            </button>
            <button
              className="btn-bulk-delete"
              onClick={handleBulkDelete}
              disabled={selected.size === 0}
              title="Delete selected"
            >
              Delete
            </button>
          </div>
        </div>
      )}

      <div className="role-list">
        {roles.map(job => (
          <div
            key={job.rowIndex}
            className={`role-card${job.status === 'Duplicate' ? ' role-duplicate' : ''}${selected.has(job.rowIndex) ? ' role-selected' : ''}`}
          >
            <div className="role-header">
              {bulkMode && (
                <input
                  type="checkbox"
                  className="role-checkbox"
                  checked={selected.has(job.rowIndex)}
                  onChange={() => toggleSelect(job.rowIndex)}
                />
              )}
              <div className="role-title">{job.role}</div>
              <span
                className="status-badge"
                style={{
                  background: (STATUS_COLORS[job.status] || '#9ca3af') + '20',
                  color: STATUS_COLORS[job.status] || '#9ca3af'
                }}
              >
                {job.status}
              </span>
            </div>

            <div className="role-meta">
              <span>Applied: {job.dateApplied}</span>
              {job.source && <span>Source: {job.source}</span>}
              {job.link && (
                <a href={job.link} target="_blank" rel="noreferrer">View Posting</a>
              )}
            </div>

            {job.compensation && (
              <div className="comp-display">
                💰 {job.compensation}
              </div>
            )}

            {job.notes && (
              <div className="email-preview">
                <button
                  className="btn-toggle-email"
                  onClick={() => setExpandedRow(expandedRow === job.rowIndex ? null : job.rowIndex)}
                >
                  {expandedRow === job.rowIndex ? '▲ Hide email' : '▼ Show email'}
                </button>
                {expandedRow === job.rowIndex && (
                  <div className="email-body">{job.notes}</div>
                )}
              </div>
            )}

            {!bulkMode && (
              <div className="role-actions">
                <button className="btn-edit" onClick={() => onEdit(job)}>Edit</button>
                {job.status !== 'Duplicate' && (
                  <button className="btn-duplicate" onClick={() => onMarkDuplicate(job)}>
                    Mark duplicate
                  </button>
                )}
                <button className="btn-delete" onClick={() => onDelete(job.rowIndex)}>Delete</button>
              </div>
            )}
          </div>
        ))}
      </div>

      {hasInterview && (
        <InterviewNotes company={companyName} />
      )}
    </div>
  )
}

export default RoleList
