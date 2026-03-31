import { useState } from 'react'
import { Link } from 'react-router-dom'

const MIN_DATE = '2025-05-01'
const MIN_DISPLAY = '05/01/2025'

function formatLastScan(ts) {
  if (!ts) return 'Never scanned'
  const d = new Date(ts)
  return `Last: ${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
}

function formatDateDisplay(yyyymmdd) {
  if (!yyyymmdd) return ''
  const [y, m, d] = yyyymmdd.split('-')
  return `${m}/${d}/${y}`
}

function parseMMDDYYYY(val) {
  // Accept MM/DD/YYYY or MM-DD-YYYY
  const cleaned = val.replace(/-/g, '/')
  const parts = cleaned.split('/')
  if (parts.length !== 3) return null
  const [m, d, y] = parts
  if (y.length !== 4 || isNaN(+m) || isNaN(+d) || isNaN(+y)) return null
  const padded = `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`
  const date = new Date(padded)
  if (isNaN(date.getTime())) return null
  return padded
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

function Navbar({ user, onLogout, onScan, onFullScan, scanning, lastScan, fromDate, toDate, onFromDateChange, onToDateChange }) {
  const [showPicker, setShowPicker] = useState(false)
  const [fromInput, setFromInput] = useState(fromDate ? formatDateDisplay(fromDate) : '')
  const [toInput, setToInput] = useState(toDate ? formatDateDisplay(toDate) : '')
  const [fromError, setFromError] = useState('')
  const [toError, setToError] = useState('')

  const handleApply = () => {
    let valid = true

    // Validate from date
    if (fromInput) {
      const parsed = parseMMDDYYYY(fromInput)
      if (!parsed) {
        setFromError('Use MM/DD/YYYY format')
        valid = false
      } else if (parsed < MIN_DATE) {
        setFromError(`Start date can't be before ${MIN_DISPLAY}`)
        valid = false
      } else {
        setFromError('')
        onFromDateChange(parsed)
      }
    } else {
      setFromError('')
      onFromDateChange('')
    }

    // Validate to date
    if (toInput) {
      const parsed = parseMMDDYYYY(toInput)
      if (!parsed) {
        setToError('Use MM/DD/YYYY format')
        valid = false
      } else {
        setToError('')
        onToDateChange(parsed)
      }
    } else {
      setToError('')
      onToDateChange('')
    }

    if (valid) setShowPicker(false)
  }

  const handleClear = (e) => {
    e.stopPropagation()
    setFromInput('')
    setToInput('')
    setFromError('')
    setToError('')
    onFromDateChange('')
    onToDateChange('')
    setShowPicker(false)
  }

  const hasFilter = fromDate || toDate

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
            <button
              className="btn-scan"
              onClick={onScan}
              disabled={!!scanning}
              title="Scan Gmail for new emails since last scan"
            >
              {scanning === 'incremental' ? <><Spinner /> Scanning...</> : 'Scan Gmail'}
            </button>
            <button
              className="btn-scan-full"
              onClick={onFullScan}
              disabled={!!scanning}
              title="Re-scan all emails from May 1 2025 with latest rules. Clears existing Gmail entries first."
            >
              {scanning === 'full' ? <><Spinner /> Scanning...</> : 'Full Scan'}
            </button>
          </div>
          <span className="last-scan-time">{formatLastScan(lastScan)}</span>
        </div>

        <div className="nav-filter">
          {hasFilter && (
            <div className="filter-chip">
              <FilterIcon />
              <span>
                {fromDate ? formatDateDisplay(fromDate) : 'Start'} → {toDate ? formatDateDisplay(toDate) : 'Today'}
              </span>
              <button
                className="filter-chip-clear"
                onClick={handleClear}
                title="Clear date filter"
              >×</button>
            </div>
          )}
          <button
            className={`btn-filter${showPicker ? ' active' : ''}`}
            onClick={() => setShowPicker(p => !p)}
            title="Filter dashboard and scan by date range"
          >
            <FilterIcon />
            {hasFilter ? 'Edit filter' : 'Filter'}
          </button>

          {showPicker && (
            <div className="nav-filter-picker">
              <div className="date-picker-row">
                <div className="date-picker-field">
                  <label>Start date</label>
                  <input
                    type="text"
                    placeholder="MM/DD/YYYY"
                    value={fromInput}
                    onChange={e => setFromInput(e.target.value)}
                    autoFocus
                  />
                  {fromError && <span className="date-error">{fromError}</span>}
                </div>
                <div className="date-picker-field">
                  <label>End date</label>
                  <input
                    type="text"
                    placeholder="MM/DD/YYYY"
                    value={toInput}
                    onChange={e => setToInput(e.target.value)}
                  />
                  {toError && <span className="date-error">{toError}</span>}
                </div>
              </div>
              <div className="date-picker-actions">
                <button className="btn-clear-date" onClick={handleClear}>Clear</button>
                <button className="btn-apply-date" onClick={handleApply}>Apply</button>
              </div>
            </div>
          )}
        </div>

        <div className="nav-user">
          {user.photo && <img src={user.photo} alt={user.name} className="avatar" />}
          <span>{user.name}</span>
          <button className="btn-logout" onClick={onLogout} title="Sign out">Logout</button>
        </div>
      </div>
    </nav>
  )
}

export default Navbar
