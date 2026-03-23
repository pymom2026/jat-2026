import { useState } from 'react'

const STATUS_OPTIONS = ['Applied', 'In Review', 'Next Steps', 'Rejected']

function JobForm({ job, onSave, onClose }) {
  const [form, setForm] = useState({
    company: job?.company || '',
    role: job?.role || '',
    dateApplied: job?.dateApplied || new Date().toISOString().split('T')[0],
    status: job?.status || 'Applied',
    source: job?.source || '',
    notes: job?.notes || '',
    link: job?.link || '',
    rowIndex: job?.rowIndex || null
  })

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }))

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.company || !form.role) return alert('Company and Role are required')
    onSave(form)
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3>{job ? 'Edit Application' : 'Add Application'}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit} className="job-form">
          <div className="form-row">
            <div className="form-group">
              <label>Company *</label>
              <input value={form.company} onChange={set('company')} placeholder="Google" required />
            </div>
            <div className="form-group">
              <label>Role *</label>
              <input value={form.role} onChange={set('role')} placeholder="Software Engineer" required />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Date Applied</label>
              <input type="date" value={form.dateApplied} onChange={set('dateApplied')} />
            </div>
            <div className="form-group">
              <label>Status</label>
              <select value={form.status} onChange={set('status')}>
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Source</label>
              <input value={form.source} onChange={set('source')} placeholder="LinkedIn, Indeed..." />
            </div>
            <div className="form-group">
              <label>Job Posting Link</label>
              <input value={form.link} onChange={set('link')} placeholder="https://..." />
            </div>
          </div>
          <div className="form-group">
            <label>Notes</label>
            <textarea value={form.notes} onChange={set('notes')} rows={3} placeholder="Any notes..." />
          </div>
          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary">{job ? 'Update' : 'Add Application'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default JobForm
