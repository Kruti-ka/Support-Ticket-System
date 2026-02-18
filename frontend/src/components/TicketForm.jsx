import { useState, useRef, useCallback } from 'react'
import { createTicket, classifyTicket } from '../api/tickets'

const CATEGORIES = ['billing', 'technical', 'account', 'general']
const PRIORITIES = ['low', 'medium', 'high', 'critical']

const EMPTY_FORM = {
  title: '',
  description: '',
  category: 'general',
  priority: 'medium',
}

export default function TicketForm({ onTicketCreated }) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [classifying, setClassifying] = useState(false)
  const [llmSuggestion, setLlmSuggestion] = useState(null)
  const [llmError, setLlmError] = useState(false)
  const [errors, setErrors] = useState({})

  // Debounce ref — classify after user stops typing for 800ms
  const debounceRef = useRef(null)

  const handleChange = useCallback((e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }))

    if (name === 'description') {
      clearTimeout(debounceRef.current)
      if (value.trim().length >= 20) {
        debounceRef.current = setTimeout(() => runClassify(value), 800)
      } else {
        setLlmSuggestion(null)
        setLlmError(false)
      }
    }
  }, [errors])

  const runClassify = async (description) => {
    setClassifying(true)
    setLlmError(false)
    try {
      const result = await classifyTicket(description)
      if (result.llm_available && result.suggested_category) {
        setLlmSuggestion(result)
        setForm((prev) => ({
          ...prev,
          category: result.suggested_category,
          priority: result.suggested_priority,
        }))
      } else {
        setLlmSuggestion(null)
      }
    } catch {
      setLlmError(true)
      setLlmSuggestion(null)
    } finally {
      setClassifying(false)
    }
  }

  const validate = () => {
    const errs = {}
    if (!form.title.trim()) errs.title = 'Title is required'
    if (form.title.length > 200) errs.title = 'Title must be ≤ 200 characters'
    if (!form.description.trim()) errs.description = 'Description is required'
    return errs
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }

    setSubmitting(true)
    try {
      const ticket = await createTicket(form)
      setForm(EMPTY_FORM)
      setLlmSuggestion(null)
      setLlmError(false)
      setErrors({})
      onTicketCreated(ticket)
    } catch (err) {
      const data = err.response?.data
      if (data && typeof data === 'object') {
        setErrors(data)
      } else {
        setErrors({ non_field: 'Failed to submit ticket. Please try again.' })
      }
    } finally {
      setSubmitting(false)
    }
  }

  const titleLen = form.title.length

  return (
    <div className="card">
      <div className="card-title">🎫 Submit a Ticket</div>

      <form onSubmit={handleSubmit} noValidate>
        {/* Title */}
        <div className="form-group">
          <label htmlFor="title">Title *</label>
          <input
            id="title"
            type="text"
            name="title"
            value={form.title}
            onChange={handleChange}
            placeholder="Brief summary of the issue"
            maxLength={200}
            style={errors.title ? { borderColor: 'var(--danger)' } : {}}
          />
          <div className={`char-count ${titleLen > 180 ? 'warn' : ''}`}>
            {titleLen}/200
          </div>
          {errors.title && (
            <div style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: '0.25rem' }}>
              {errors.title}
            </div>
          )}
        </div>

        {/* Description */}
        <div className="form-group">
          <label htmlFor="description">Description *</label>
          <textarea
            id="description"
            name="description"
            value={form.description}
            onChange={handleChange}
            placeholder="Describe your issue in detail (min 20 characters for AI classification)"
            rows={4}
            style={errors.description ? { borderColor: 'var(--danger)' } : {}}
          />
          {errors.description && (
            <div style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: '0.25rem' }}>
              {errors.description}
            </div>
          )}
        </div>

        {/* LLM Banner */}
        {classifying && (
          <div className="llm-banner loading">
            <div className="spinner" />
            AI is analysing your description…
          </div>
        )}
        {!classifying && llmSuggestion && (
          <div className="llm-banner">
            ✨ AI suggested: <strong>{llmSuggestion.suggested_category}</strong> / <strong>{llmSuggestion.suggested_priority}</strong> — you can override below
          </div>
        )}
        {!classifying && llmError && (
          <div className="llm-banner error">
            ⚠ AI classification unavailable — please select manually
          </div>
        )}

        {/* Category + Priority row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label htmlFor="category">Category</label>
            <select
              id="category"
              name="category"
              value={form.category}
              onChange={handleChange}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label htmlFor="priority">Priority</label>
            <select
              id="priority"
              name="priority"
              value={form.priority}
              onChange={handleChange}
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
              ))}
            </select>
          </div>
        </div>

        {errors.non_field && (
          <div style={{ color: 'var(--danger)', fontSize: '0.85rem', marginTop: '0.75rem' }}>
            {errors.non_field}
          </div>
        )}

        <div style={{ marginTop: '1.25rem' }}>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting || classifying}
          >
            {submitting ? (
              <><div className="spinner" style={{ borderTopColor: '#fff' }} /> Submitting…</>
            ) : (
              '+ Submit Ticket'
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
