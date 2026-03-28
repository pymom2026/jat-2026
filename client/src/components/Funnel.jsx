function Funnel({ jobs, allJobs }) {
  const total = jobs.length
  if (total === 0) return null
  const inReview = jobs.filter(j => j.status === 'In Review').length
  const interviewing = jobs.filter(j => j.status === 'Interview').length
  const rejected = jobs.filter(j => j.status === 'Rejected').length
  const leads = (allJobs || jobs).filter(j => j.status === 'Leads').length
  const pct = (n) => total > 0 ? Math.round((n / total) * 100) : 0
  const stages = [
    { label: 'Applied', count: total, color: '#6366f1', width: 100 },
    { label: 'In Review', count: inReview, color: '#f59e0b', width: Math.max(pct(inReview), 8) },
    { label: 'Interview', count: interviewing, color: '#10b981', width: Math.max(pct(interviewing), 8) },
    { label: 'Rejected', count: rejected, color: '#ef4444', width: Math.max(pct(rejected), 8) },
  ]
  return (
    <div className="funnel-section">
      <h3 className="funnel-title">Conversion Funnel</h3>
      <div className="funnel-chart">
        {stages.map((stage, i) => (
          <div key={stage.label} className="funnel-row">
            <div className="funnel-label">
              <span>{stage.label}</span>
              <span className="funnel-count">{stage.count}</span>
            </div>
            <div className="funnel-bar-track">
              <div className="funnel-bar" style={{ width: `${stage.width}%`, background: stage.color }} />
            </div>
            <div className="funnel-pct">
              {i === 0 ? '100%' : `${pct(stage.count)}%`}
            </div>
          </div>
        ))}
      </div>
      <div className="funnel-note">
        {interviewing > 0 && total > 0 &&
          `Response rate: ${pct(inReview + interviewing)}% · Interview rate: ${pct(interviewing)}%`}
      </div>
      {leads > 0 && (
        <div className="leads-section">
          <h3 className="funnel-title" style={{ marginTop: '24px' }}>Leads</h3>
          <div className="funnel-row">
            <div className="funnel-label">
              <span>Saved Jobs</span>
              <span className="funnel-count">{leads}</span>
            </div>
            <div className="funnel-bar-track">
              <div className="funnel-bar" style={{ width: '100%', background: '#8b5cf6' }} />
            </div>
            <div className="funnel-pct">LinkedIn</div>
          </div>
        </div>
      )}
    </div>
  )
}
export default Funnel
