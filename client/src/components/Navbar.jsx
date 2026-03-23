import { useState } from 'react'
import { Link } from 'react-router-dom'

function formatLastScan(ts) {
  if (!ts) return 'Never scanned'
  const d = new Date(ts)
  return `Last: ${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
}

function formatDateShort(dateStr) {
  if (!dateStr) return ''
  const [y, m, d] = dateStr.split('-')
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${months[parseInt(m,10)-1]} ${parseInt(d,10)}, ${y}`
}

function Spinner() {
  return <span className="scan-spinner" aria-hidden="true" />
}

function FilterIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
    </svg>
  )
}

function Navbar({ user, onLogout, onScan, onFullScan, scanning, lastScan, fromDate, onFromDateChange }) {
  const [showPicker, setShowPicker] = useState(false)

  const handleDateChange = (val) => {
    onFromDateChange(val)
    const year = val?.split('-')[0]
    if (val && year?.length === 4 && parseInt(year) > 1970) setShowPicker(false)
  }

  const handleClear = (e) => {
    e.stopPropagation()
    onFromDateChange('')
    setShowPicker(false)
  }

  return (
    <nav className="navbar">
      <Link to="/" className="nav-brand">
        <svg viewBox="0 0 24 24" fill="none">
          <rect x="2" y="3" width="20" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
          <path d="M8 10h8M8 14h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
        Job Tracker
      </Link>
      <div className="nav-actions">
        <div className="scan-group">
          <div className="scan-buttons">
            <button className="btn-scan" onClick={onScan} disabled={!!scanning}>
              {scanning === 'incremental' ? <><Spinner /> Scanning...</> : 'Scan Gmail'}
            </button>
            <button className="btn-scan-full" onClick={onFullScan} disabled={!!scanning} title="Re-scan full mailbox with updated filters">
              {scanning === 'full' ? <><Spinner /> Scanning...</> : 'Full Scan'}
            </button>
          </div>
          <span className="last-scan-time">{formatLastScan(lastScan)}</span>
        </div>

        {fromDate ? (
          <div className="filter-chip">
            <FilterIcon />
            <span>From: {formatDateShort(fromDate)}</span>
            <button className="filter-chip-clear" onClick={handleClear} title="Clear filter">×</button>
          </div>
        ) : (
          <div className="nav-filter">
            <button
              className={`btn-filter${showPicker ? ' active' : ''}`}
              onClick={() => setShowPicker(p => !p)}
              title="Filter by start date"
            >
              <FilterIcon />
              Filter
            </button>
            {showPicker && (
              <div className="nav-filter-picker">
                <label>Show from</label>
                <input
                  type="date"
                  autoFocus
                  onChange={e => handleDateChange(e.target.value)}
                />
                <button className="btn-clear-date" onClick={() => setShowPicker(false)}>Cancel</button>
              </div>
            )}
          </div>
        )}

        <div className="nav-user">
          {user.photo && <img src={user.photo} alt={user.name} className="avatar" />}
          <span>{user.name}</span>
          <button className="btn-logout" onClick={onLogout}>Logout</button>
        </div>
      </div>
    </nav>
  )
}

export default Navbar
