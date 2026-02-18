import { useState, useEffect, useCallback } from 'react'
import { fetchStats } from './api/tickets'
import TicketForm from './components/TicketForm'
import TicketList from './components/TicketList'
import StatsDashboard from './components/StatsDashboard'

export default function App() {
  const [stats, setStats] = useState(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [toast, setToast] = useState(null)

  const loadStats = useCallback(async () => {
    try {
      const data = await fetchStats()
      setStats(data)
    } catch {
      // Stats are non-critical — fail silently
    }
  }, [])

  useEffect(() => {
    loadStats()
  }, [loadStats, refreshTrigger])

  const handleTicketCreated = (ticket) => {
    // Trigger list + stats refresh
    setRefreshTrigger((n) => n + 1)
    // Show success toast
    setToast(`✓ Ticket "${ticket.title}" submitted!`)
    setTimeout(() => setToast(null), 3500)
  }

  return (
    <div className="app">
      <header>
        <span style={{ fontSize: '1.5rem' }}>🛠</span>
        <h1>Support Ticket System</h1>
        <span className="subtitle">Powered by Groq AI</span>
      </header>

      {/* Stats Dashboard — full width above the grid */}
      <StatsDashboard stats={stats} />

      {/* Main two-column layout */}
      <div className="main-grid">
        {/* Left: Submit form */}
        <div>
          <TicketForm onTicketCreated={handleTicketCreated} />
        </div>

        {/* Right: Ticket list */}
        <div>
          <div className="section-header">
            <div className="section-title">All Tickets</div>
          </div>
          <TicketList refreshTrigger={refreshTrigger} />
        </div>
      </div>

      {/* Toast notification */}
      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}
