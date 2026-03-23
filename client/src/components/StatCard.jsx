function StatCard({ label, count, color, onClick }) {
  return (
    <div className="stat-card" style={{ borderTopColor: color }} onClick={onClick}>
      <div className="stat-count" style={{ color }}>{count}</div>
      <div className="stat-label">{label}</div>
      <div className="stat-arrow">→</div>
    </div>
  )
}

export default StatCard
