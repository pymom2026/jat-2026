import { useParams, useNavigate } from 'react-router-dom'

const STATUS_COLORS = {
  'Applied': '#6366f1',
  'In Review': '#f59e0b',
  'Next Steps': '#10b981',
  'Rejected': '#ef4444'
}

function RoleList({ jobs, onEdit, onDelete }) {
  const { company } = useParams()
  const navigate = useNavigate()
  const companyName = decodeURIComponent(company)
  const roles = jobs.filter(j => j.company === companyName)

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
          <div key={job.rowIndex} className="role-card">
            <div className="role-header">
              <div className="role-title">{job.role}</div>
              <span className="status-badge" style={{ background: STATUS_COLORS[job.status] + '20', color: STATUS_COLORS[job.status] }}>
                {job.status}
              </span>
            </div>
            <div className="role-meta">
              <span>Applied: {job.dateApplied}</span>
              {job.source && <span>Source: {job.source}</span>}
              {job.link && <a href={job.link} target="_blank" rel="noreferrer">View Posting</a>}
            </div>
            {job.notes && <div className="role-notes">{job.notes}</div>}
            <div className="role-actions">
              <button className="btn-edit" onClick={() => onEdit(job)}>Edit</button>
              <button className="btn-delete" onClick={() => onDelete(job.rowIndex)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default RoleList
