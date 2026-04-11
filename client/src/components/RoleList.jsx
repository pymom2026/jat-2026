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

function RoleList({ jobs, onEdit, onDelete, onMarkDuplicate }) {
  const { company } = useParams()
  const navigate = useNavigate()
  const [expandedRow, setExpandedRow] = useState(null)
  const companyName = decodeURIComponent(company)
  const roles = jobs.filter(j => j.company === companyName)
  const hasInterview = roles.some(j => j.status === 'Interview')

  return (
    <div className="list-page">
      <div className="page-header">
        <button className="btn-back" onClick={() => navigate(-1)}>← Back</button>
        <div className="company-header">
          <div className="company-initial large">{companyName.charAt(0).toUpperCase()}</div>
          <h2>{companyName}</h2>
        </div>
        <span className="count-badge">{roles.length} role{roles.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="role-list">
        {roles.map(job => (
          <div
            key={job.rowIndex}
            className={`role-card${job.status === 'Duplicate' ? ' role-duplicate' : ''}`}
          >
            <div className="role-header">
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

            {/* Email preview toggle */}
            {job.notes && (
              <div className="email-preview">
                <button
                  className="btn-toggle-email"
                  onClick={() => setExpandedRow(expandedRow === job.rowIndex ? null : job.rowIndex)}
                >
                  {expandedRow === job.rowIndex ? '▲ Hide email' : '▼ Show email'}
                </button>
                {expandedRow === job.rowIndex && (
                  <div className="email-body">
                    {job.notes}
                  </div>
                )}
              </div>
            )}

            <div className="role-actions">
              <button className="btn-edit" onClick={() => onEdit(job)}>Edit</button>
              {job.status !== 'Duplicate' && (
                <button
                  className="btn-duplicate"
                  onClick={() => onMarkDuplicate(job)}
                >
                  Mark duplicate
                </button>
              )}
              <button className="btn-delete" onClick={() => onDelete(job.rowIndex)}>Delete</button>
            </div>
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
