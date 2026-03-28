import { useParams, useNavigate, Link } from 'react-router-dom'

const STATUS_DISPLAY = {
  all: 'All Applications',
  'In Review': 'In Review',
  'Interview': 'Interview',
  'Rejected': 'Rejected',
  'Leads': 'Leads',
}

const EXCLUDED_FROM_COUNT = ['Leads', 'Duplicate']

function CompanyList({ jobs, onEdit, onDelete }) {
  const { statusKey } = useParams()
  const navigate = useNavigate()
  const filtered = statusKey === 'all'
    ? jobs.filter(j => !EXCLUDED_FROM_COUNT.includes(j.status))
    : jobs.filter(j => j.status === statusKey)

  const companies = {}
  for (const job of filtered) {
    if (!companies[job.company]) companies[job.company] = []
    companies[job.company].push(job)
  }

  return (
    <div className="list-page">
      <div className="page-header">
        <button className="btn-back" onClick={() => navigate('/')}>← Back</button>
        <h2>{STATUS_DISPLAY[statusKey] || statusKey}</h2>
        <span className="count-badge">{filtered.length} applications</span>
      </div>
      {Object.keys(companies).length === 0 ? (
        <div className="empty-state">No applications found</div>
      ) : (
        <div className="company-grid">
          {Object.entries(companies).map(([company, roles]) => (
            <Link key={company} to={`/company/${encodeURIComponent(company)}`} className="company-card">
              <div className="company-initial">{company.charAt(0).toUpperCase()}</div>
              <div className="company-info">
                <div className="company-name">{company}</div>
                <div className="company-roles">{roles.length} role{roles.length !== 1 ? 's' : ''}</div>
              </div>
              <div className="status-dots">
                {roles.map((r, i) => (
                  <span key={i} className={`status-dot status-${r.status.toLowerCase().replace(' ', '-')}`} title={r.status} />
                ))}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
export default CompanyList
