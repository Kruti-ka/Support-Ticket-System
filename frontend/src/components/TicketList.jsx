import { useState, useEffect, useCallback } from 'react'
import { fetchTickets } from '../api/tickets'
import TicketCard from './TicketCard'

const CATEGORIES = ['', 'billing', 'technical', 'account', 'general']
const PRIORITIES = ['', 'low', 'medium', 'high', 'critical']
const STATUSES = ['', 'open', 'in_progress', 'resolved', 'closed']

export default function TicketList({ refreshTrigger }) {
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ search: '', category: '', priority: '', status: '' })

  const loadTickets = useCallback(async () => {
    setLoading(true)
    try {
      // Build params — omit empty strings
      const params = {}
      if (filters.search)   params.search   = filters.search
      if (filters.category) params.category = filters.category
      if (filters.priority) params.priority = filters.priority
      if (filters.status)   params.status   = filters.status

      const data = await fetchTickets(params)
      setTickets(data)
    } catch {
      setTickets([])
    } finally {
      setLoading(false)
    }
  }, [filters, refreshTrigger])

  useEffect(() => {
    loadTickets()
  }, [loadTickets])

  const handleFilterChange = (e) => {
    const { name, value } = e.target
    setFilters((prev) => ({ ...prev, [name]: value }))
  }

  const handleTicketUpdated = (updated) => {
    setTickets((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
  }

  const clearFilters = () => {
    setFilters({ search: '', category: '', priority: '', status: '' })
  }

  const hasFilters = filters.search || filters.category || filters.priority || filters.status

  return (
    <div>
      {/* Filter Bar */}
      <div className="filter-bar">
        <input
          type="text"
          name="search"
          value={filters.search}
          onChange={handleFilterChange}
          placeholder="🔍 Search title or description…"
        />

        <select name="category" value={filters.category} onChange={handleFilterChange}>
          <option value="">All Categories</option>
          {CATEGORIES.filter(Boolean).map((c) => (
            <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
          ))}
        </select>

        <select name="priority" value={filters.priority} onChange={handleFilterChange}>
          <option value="">All Priorities</option>
          {PRIORITIES.filter(Boolean).map((p) => (
            <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
          ))}
        </select>

        <select name="status" value={filters.status} onChange={handleFilterChange}>
          <option value="">All Statuses</option>
          {STATUSES.filter(Boolean).map((s) => (
            <option key={s} value={s}>{s.replace('_', ' ')}</option>
          ))}
        </select>

        {hasFilters && (
          <button className="btn btn-ghost btn-sm" onClick={clearFilters}>
            ✕ Clear
          </button>
        )}

        <span className="filter-count">
          {loading ? '…' : `${tickets.length} ticket${tickets.length !== 1 ? 's' : ''}`}
        </span>
      </div>

      {/* Ticket List */}
      {loading ? (
        <div style={{ color: 'var(--text-muted)', padding: '2rem 0', textAlign: 'center' }}>
          <div className="spinner" style={{ margin: '0 auto 0.75rem', width: 24, height: 24, borderWidth: 3 }} />
          Loading tickets…
        </div>
      ) : tickets.length === 0 ? (
        <div className="empty-state">
          <div className="icon">🎫</div>
          <p>{hasFilters ? 'No tickets match your filters.' : 'No tickets yet. Submit one!'}</p>
        </div>
      ) : (
        <div className="ticket-list">
          {tickets.map((ticket) => (
            <TicketCard
              key={ticket.id}
              ticket={ticket}
              onUpdated={handleTicketUpdated}
            />
          ))}
        </div>
      )}
    </div>
  )
}
