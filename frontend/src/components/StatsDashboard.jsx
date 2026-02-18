const PRIORITY_COLORS = {
  low: '#10b981',
  medium: '#f59e0b',
  high: '#f97316',
  critical: '#ef4444',
}

const CATEGORY_COLORS = {
  billing: '#6c63ff',
  technical: '#00c9b1',
  account: '#a855f7',
  general: '#94a3b8',
}

function BreakdownSection({ title, data, colors, total }) {
  return (
    <div className="card" style={{ padding: '1rem 1.25rem' }}>
      <div className="breakdown-title">{title}</div>
      {Object.entries(data).map(([key, count]) => {
        const pct = total > 0 ? Math.round((count / total) * 100) : 0
        return (
          <div className="breakdown-row" key={key}>
            <span style={{ minWidth: 72, textTransform: 'capitalize', fontSize: '0.8125rem' }}>
              {key.replace('_', ' ')}
            </span>
            <div className="breakdown-bar-wrap">
              <div
                className="breakdown-bar"
                style={{ width: `${pct}%`, background: colors[key] || '#64748b' }}
              />
            </div>
            <span className="breakdown-count">{count}</span>
          </div>
        )
      })}
    </div>
  )
}

export default function StatsDashboard({ stats }) {
  if (!stats) {
    return (
      <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
        Loading stats…
      </div>
    )
  }

  const { total_tickets, open_tickets, avg_tickets_per_day, priority_breakdown, category_breakdown } = stats

  return (
    <div style={{ marginBottom: '2rem' }}>
      {/* Top-level numbers */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total Tickets</div>
          <div className="stat-value accent">{total_tickets}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Open</div>
          <div className="stat-value" style={{ color: 'var(--open)' }}>{open_tickets}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Avg / Day</div>
          <div className="stat-value">{avg_tickets_per_day}</div>
        </div>
      </div>

      {/* Breakdowns */}
      <div className="breakdown-grid">
        <BreakdownSection
          title="By Priority"
          data={priority_breakdown}
          colors={PRIORITY_COLORS}
          total={total_tickets}
        />
        <BreakdownSection
          title="By Category"
          data={category_breakdown}
          colors={CATEGORY_COLORS}
          total={total_tickets}
        />
      </div>
    </div>
  )
}
