import { useState, useEffect } from 'react'
import axios from 'axios'

const ROUNDS = ['Phone Screen', 'Technical', 'Hiring Manager', 'Panel', 'Final', 'Other']

function InterviewNoteForm({ company, note, onSave, onClose }) {
  const [form, setForm] = useState({
    company,
    round: note?.round || 'Phone Screen',
    date: note?.date || new Date().toISOString().split('T')[0],
    questions: note?.questions || '',
    answers: note?.answers || '',
    improvements: note?.improvements || '',
    nextSteps: note?.nextSteps || '',
    followUpDate: note?.followUpDate || '',
    likelyToProgress: note?.likelyToProgress || '',
    rowIndex: note?.rowIndex || null
  })

  const set = field => e => setForm(f => ({ ...f, [field]: e.target.value }))

  const handleSubmit = async e => {
    e.preventDefault()
    await onSave(form)
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-wide">
        <div className="modal-header">
          <h3>{note ? 'Edit Interview Notes' : 'Add Interview Notes'}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit} className="job-form">
          <div className="form-row">
            <div className="form-group">
              <label>Round</label>
              <select value={form.round} onChange={set('round')}>
                {ROUNDS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Interview Date</label>
              <input type="date" value={form.date} onChange={set('date')} />
            </div>
            <div className="form-group">
              <label>Follow Up Date</label>
              <input type="date" value={form.followUpDate} onChange={set('followUpDate')} />
            </div>
          </div>
          <div className="form-group">
            <label>Likely to Progress</label>
              <div className="score-selector">
                {[1, 2, 3, 4, 5].map(n => (
                  <button
                    key={n}
                    type="button"
                    className={`score-btn${form.likelyToProgress === String(n) ? ' selected' : ''}`}
                    onClick={() => setForm(f => ({ ...f, likelyToProgress: String(n) }))}
                    title={['Very unlikely', 'Unlikely', 'Maybe', 'Likely', 'Very likely'][n - 1]}
                  >
                    {n}
                  </button>
                ))}
                <span className="score-label">
                  {form.likelyToProgress ? ['Very unlikely', 'Unlikely', 'Maybe', 'Likely', 'Very likely'][parseInt(form.likelyToProgress) - 1] : 'Not rated'}
                </span>
              </div>
        </div>
          <div className="form-group">
            <label>Questions Asked</label>
            <textarea
              value={form.questions}
              onChange={set('questions')}
              rows={4}
              placeholder="What questions did they ask you?"
            />
          </div>
          <div className="form-group">
            <label>My Answers</label>
            <textarea
              value={form.answers}
              onChange={set('answers')}
              rows={4}
              placeholder="How did you answer?"
            />
          </div>
          <div className="form-group">
            <label>What I'd Do Better</label>
            <textarea
              value={form.improvements}
              onChange={set('improvements')}
              rows={3}
              placeholder="What would you improve next time?"
            />
          </div>
          <div className="form-group">
            <label>Next Steps</label>
            <textarea
              value={form.nextSteps}
              onChange={set('nextSteps')}
              rows={2}
              placeholder="What did they say would happen next? Timeline?"
            />
          </div>
          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary">
              {note ? 'Update' : 'Save Notes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function InterviewNotes({ company }) {
  const [notes, setNotes] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editNote, setEditNote] = useState(null)
  const [expanded, setExpanded] = useState(null)

  const fetchNotes = async () => {
    try {
      const r = await axios.get(`/api/interviews/${encodeURIComponent(company)}`)
      setNotes(r.data)
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => { fetchNotes() }, [company])

  const handleSave = async form => {
    try {
      if (form.rowIndex) {
        await axios.put(`/api/interviews/${form.rowIndex}`, form)
      } else {
        await axios.post('/api/interviews', form)
      }
      setShowForm(false)
      setEditNote(null)
      fetchNotes()
    } catch (err) {
      alert('Error saving notes: ' + err.message)
    }
  }

  const handleDelete = async rowIndex => {
    if (!confirm('Delete this interview note?')) return
    try {
      await axios.delete(`/api/interviews/${rowIndex}`)
      fetchNotes()
    } catch (err) {
      alert('Error deleting note')
    }
  }

  return (
    <div className="interview-notes-section">
      <div className="interview-notes-header">
        <h3 className="interview-notes-title">Interview Notes</h3>
        <button
          className="btn-add-note"
          onClick={() => { setEditNote(null); setShowForm(true) }}
          title="Add interview round notes"
        >
          + Add Round
        </button>
      </div>

      {notes.length === 0 ? (
        <div className="interview-notes-empty">
          No interview notes yet. Add notes after each round!
        </div>
      ) : (
        <div className="interview-rounds">
          {notes.map(note => (
            <div key={note.rowIndex} className="interview-round-card">
              <div
                className="round-header"
                onClick={() => setExpanded(expanded === note.rowIndex ? null : note.rowIndex)}
              >
                <div className="round-info">
                  <span className="round-badge">{note.round}</span>
                  <span className="round-date">{note.date}</span>
                  {note.followUpDate && (
                    <span className="round-followup">Follow up: {note.followUpDate}</span>
                  )}
                  {note.likelyToProgress && (
                    <span className="round-score" title="Likely to progress">
                      {'★'.repeat(parseInt(note.likelyToProgress))}{'☆'.repeat(5 - parseInt(note.likelyToProgress))}
                    </span>
                  )}
                </div>
                <div className="round-actions">
                  <button
                    className="btn-edit"
                    onClick={e => { e.stopPropagation(); setEditNote(note); setShowForm(true) }}
                  >
                    Edit
                  </button>
                  <button
                    className="btn-delete"
                    onClick={e => { e.stopPropagation(); handleDelete(note.rowIndex) }}
                  >
                    Delete
                  </button>
                  <span className="round-toggle">
                    {expanded === note.rowIndex ? '▲' : '▼'}
                  </span>
                </div>
              </div>

              {expanded === note.rowIndex && (
                <div className="round-details">
                  {note.questions && (
                    <div className="round-field">
                      <div className="round-field-label">Questions Asked</div>
                      <div className="round-field-value">{note.questions}</div>
                    </div>
                  )}
                  {note.answers && (
                    <div className="round-field">
                      <div className="round-field-label">My Answers</div>
                      <div className="round-field-value">{note.answers}</div>
                    </div>
                  )}
                  {note.improvements && (
                    <div className="round-field">
                      <div className="round-field-label">What I'd Do Better</div>
                      <div className="round-field-value">{note.improvements}</div>
                    </div>
                  )}
                  {note.nextSteps && (
                    <div className="round-field">
                      <div className="round-field-label">Next Steps</div>
                      <div className="round-field-value">{note.nextSteps}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <InterviewNoteForm
          company={company}
          note={editNote}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditNote(null) }}
        />
      )}
    </div>
  )
}

export default InterviewNotes
