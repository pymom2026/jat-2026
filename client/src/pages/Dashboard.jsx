import { Routes, Route, useNavigate } from 'react-router-dom'
import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import Navbar from '../components/Navbar'
import StatCard from '../components/StatCard'
import CompanyList from '../components/CompanyList'
import RoleList from '../components/RoleList'
import JobForm from '../components/JobForm'
import Funnel from '../components/Funnel'

const STATUS_LABELS = ['Total Applied', 'In Review', 'Interview', 'Rejected']
const STATUS_KEYS = ['all', 'In Review', 'Interview', 'Rejected']
const STATUS_COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444']
const EXCLUDED_FROM_COUNT = ['Leads', 'Referred', 'Duplicate']

function formatDateShort(dateStr) {
  if (!dateStr) return ''
  const [y, m, d] = dateStr.split('-')
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${months[parseInt(m,10)-1]} ${parseInt(d,10)}, ${y}`
}

function DashboardHome({ jobs, allJobs, fromDate, toDate, onRefresh, onAddJob }) {
  const navigate = useNavigate()
  const [insight, setInsight] = useState(null)
  const [insightLoading, setInsightLoading] = useState(false)
  const [insightError, setInsightError] = useState(null)
  const [showInsight, setShowInsight] = useState(false)

  const activeJobs = jobs.filter(j => !EXCLUDED_FROM_COUNT.includes(j.status))
  const rejectedCount = activeJobs.filter(j => j.status === 'Rejected').length
console.log('rejectedCount:', rejectedCount, 'activeJobs:', activeJobs.length)
  const counts = [
    activeJobs.length,
    activeJobs.filter(j => j.status === 'In Review').length,
    activeJobs.filter(j => j.status === 'Interview').length,
    rejectedCount,
  ]

  const fetchInsight = async () => {
    setInsightLoading(true)
    setInsightError(null)
    setShowInsight(true)
    try {
      const r = await axios.post('/api/jobs/insights')
      setInsight(r.data)
    } catch (err) {
      setInsightError('Failed to get insights. Try again.')
    } finally {
      setInsightLoading(false)
    }
  }

  return (
    <div className="dashboard-home">
      <div className="dashboard-header">
        <h2>Dashboard</h2>
        <div className="dashboard-actions">
          <button
            className="btn-secondary"
            onClick={onRefresh}
            title="Refresh job list"
          >
            Refresh
          </button>
          
          <button
              className="btn-insights"
              onClick={fetchInsight}
              disabled={insightLoading}
              title="Use AI to analyze your rejection patterns"
            >
              {insightLoading ? '⏳ Analyzing...' : '✦ Get insights'}
          </button>
          
          <button
            className="btn-primary"
            onClick={onAddJob}
            title="Manually add a job application"
          >
            + Add Job
          </button>
        </div>
      </div>

      {(fromDate || toDate) && (
        <div className="filter-notice">
          Showing {activeJobs.length} of {allJobs.filter(j => !EXCLUDED_FROM_COUNT.includes(j.status)).length} applications
          {fromDate && ` from ${formatDateShort(fromDate)}`}
          {toDate && ` to ${formatDateShort(toDate)}`}
        </div>
      )}

      <div className="stat-grid">
        {STATUS_LABELS.map((label, i) => (
          <StatCard
            key={label}
            label={label}
            count={counts[i]}
            color={STATUS_COLORS[i]}
            onClick={() => navigate(`/status/${STATUS_KEYS[i]}`)}
          />
        ))}
      </div>

      <Funnel jobs={jobs} allJobs={allJobs} />

      {showInsight && (
        <div className="insight-card" style={{ marginTop: '24px' }}>
          {insightLoading && (
            <div className="insight-loading">
              Analyzing {rejectedCount} rejections...
            </div>
          )}
          {insightError && (
            <div className="insight-error">{insightError}</div>
          )}
          {insight && !insightLoading && (
            <>
              <div className="insight-text">
  {insight.insight.split('\n').filter(Boolean).map((line, i) => {
    const parts = line.split(/\*\*(.*?)\*\*/g)
    const rendered = parts.map((part, j) =>
      j % 2 === 1 ? <strong key={j}>{part}</strong> : part
    )
    if (line.startsWith('#')) {
      return <p key={i} style={{ fontWeight: 500, marginBottom: 6 }}>{line.replace(/^#+\s*/, '')}</p>
    }
    return <p key={i}>{rendered}</p>
  })}
</div>
              <div className="insight-meta">
                Based on {insight.count} rejections
                <button
                  className="insight-dismiss"
                  onClick={() => { setShowInsight(false); setInsight(null) }}
                >
                  dismiss
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function Dashboard({ user, setUser }) {
  const [allJobs, setAllJobs] = useState([])
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editJob, setEditJob] = useState(null)
  const [scanning, setScanning] = useState(null)
  const [scanResult, setScanResult] = useState(null)
  const [lastScan, setLastScan] = useState(null)

  const fetchJobs = useCallback(async () => {
    try {
      setLoading(true)
      const r = await axios.get('/api/jobs')
      setAllJobs(r.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchJobs()
    axios.get('/api/gmail/scan-status')
      .then(r => setLastScan(r.data.lastScan))
      .catch(() => {})
  }, [fetchJobs])

  const jobs = allJobs.filter(j => {
    if (fromDate && j.dateApplied < fromDate) return false
    if (toDate && j.dateApplied > toDate) return false
    return true
  })

  const handleLogout = async () => {
    await axios.get('/auth/logout')
    setUser(null)
  }

  const runScan = async (full = false) => {
    setScanning(full ? 'full' : 'incremental')
    setScanResult(null)
    try {
      const params = new URLSearchParams()
      if (full) params.set('full', 'true')
      if (fromDate) params.set('from', fromDate)
      if (toDate) params.set('to', toDate)
      const r = await axios.post(`/api/gmail/scan?${params.toString()}`)
      setScanResult({ ...r.data, full })
      setLastScan(new Date().toISOString())
      if (r.data.added > 0) fetchJobs()
    } catch (err) {
      setScanResult({ error: err.response?.data?.error || 'Scan failed' })
    } finally {
      setScanning(null)
    }
  }

  const handleSave = async (job) => {
    try {
      if (job.rowIndex) {
        await axios.put(`/api/jobs/${job.rowIndex}`, job)
      } else {
        await axios.post('/api/jobs', job)
      }
      setShowForm(false)
      setEditJob(null)
      fetchJobs()
    } catch (err) {
      alert('Error saving job: ' + (err.response?.data?.error || err.message))
    }
  }

  const handleDelete = async (rowIndex) => {
    if (!confirm('Delete this application?')) return
    try {
      await axios.delete(`/api/jobs/${rowIndex}`)
      fetchJobs()
    } catch (err) {
      alert('Error deleting job')
    }
  }

  const handleMarkDuplicate = async (job) => {
    try {
      await axios.put(`/api/jobs/${job.rowIndex}`, { ...job, status: 'Duplicate' })
      fetchJobs()
    } catch (err) {
      alert('Error marking duplicate: ' + err.message)
    }
  }

  return (
    <div className="app-layout">
      <Navbar
        user={user}
        onLogout={handleLogout}
        onScan={() => runScan(false)}
        onFullScan={() => runScan(true)}
        scanning={scanning}
        lastScan={lastScan}
        fromDate={fromDate}
        toDate={toDate}
        onFromDateChange={setFromDate}
        onToDateChange={setToDate}
      />

      {scanResult && (
        <div className={`scan-banner ${scanResult.error ? 'error' : 'success'}`}>
          {scanResult.error
            ? `Error: ${scanResult.error}`
            : `${scanResult.full ? 'Full scan' : 'Incremental scan'}: checked ${scanResult.scanned} emails — ${scanResult.added} new jobs added`}
          <button onClick={() => setScanResult(null)}>×</button>
        </div>
      )}

      <main className="main-content">
        {loading ? (
          <div className="loading">Loading jobs...</div>
        ) : (
          <Routes>
            <Route path="/" element={
              <DashboardHome
                jobs={jobs}
                allJobs={allJobs}
                fromDate={fromDate}
                toDate={toDate}
                onRefresh={fetchJobs}
                onAddJob={() => { setEditJob(null); setShowForm(true) }}
              />
            } />
            <Route path="/status/:statusKey" element={
              <CompanyList
                jobs={jobs}
                onEdit={j => { setEditJob(j); setShowForm(true) }}
                onDelete={handleDelete}
              />
            } />
            <Route path="/company/:company" element={
              <RoleList
                jobs={allJobs}
                onEdit={j => { setEditJob(j); setShowForm(true) }}
                onDelete={handleDelete}
                onMarkDuplicate={handleMarkDuplicate}
              />
            } />
          </Routes>
        )}
      </main>

      {showForm && (
        <JobForm
          job={editJob}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditJob(null) }}
        />
      )}
    </div>
  )
}

export default Dashboard
