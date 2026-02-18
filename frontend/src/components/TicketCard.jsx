import { useState } from 'react'
import { updateTicket } from '../api/tickets'

const STATUS_OPTIONS = ['open', 'in_progress', 'resolved', 'closed']

function formatDate(iso) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

export default function TicketCard({ ticket, onUpdated }) {
  const [updating, setUpdating] = useState(false)

  const handleStatusChange = async (e) => {
    const newStatus = e.target.value
    setUpdating(true)
    try {
      const updated = await updateTicket(ticket.id, { status: newStatus })
      onUpdated(updated)
    } catch {
      // silently ignore — status reverts visually on next render
    } finally {
      setUpdating(false)
    }
  }

  return (
    <div className="ticket-card">
      <div className="ticket-header">
        <div className="ticket-title">{ticket.title}</div>
        <span className={`badge badge-priority-${ticket.priority}`}>
          {ticket.priority}
        </span>
      </div>

      <div className="ticket-desc">{ticket.description}</div>

      <div className="ticket-meta">
        <span className="badge badge-category">{ticket.category}</span>

        <span className={`badge badge-status-${ticket.status}`}>
          {ticket.status.replace('_', ' ')}
        </span>

        {/* Inline status changer */}
        <select
          className="status-select"
          value={ticket.status}
          onChange={handleStatusChange}
          disabled={updating}
          title="Change status"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s.replace('_', ' ')}</option>
          ))}
        </select>

        <span className="ticket-time">{formatDate(ticket.created_at)}</span>
      </div>
    </div>
  )
}
