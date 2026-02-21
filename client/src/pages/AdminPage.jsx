import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authApi, getUser } from '../api'
import Loading from '../components/Loading'

export default function AdminPage() {
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const user = getUser()
    if (!user || user.role !== 'admin') {
      navigate('/', { replace: true })
      return
    }
    Promise.all([
      authApi.get('/admin/stats'),
      authApi.get('/services')
    ])
      .then(([statsRes, svcRes]) => {
        setStats(statsRes.data.stats)
        setServices(svcRes.data.services)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="container"><Loading /></div>

  return (
    <div className="container animate-fade-in">
      <div className="page-header">
        <h1>Admin Dashboard</h1>
      </div>

      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value">{stats.total_agents}</div>
            <div className="stat-label">Agents</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.total_services}</div>
            <div className="stat-label">Services</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.total_transactions}</div>
            <div className="stat-label">Transactions</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.total_balance_in_circulation.toLocaleString()}</div>
            <div className="stat-label">Points in Circulation</div>
          </div>
        </div>
      )}

      <section className="section">
        <h2>Registered Services</h2>
        {services.length === 0 ? (
          <p className="text-muted">No services registered.</p>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Status</th>
                  <th>Daily Limit</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {services.map(s => (
                  <tr key={s.id}>
                    <td>{s.name}</td>
                    <td><span className={`badge ${s.is_active ? 'badge-live' : 'badge-inactive'}`}>{s.is_active ? 'Active' : 'Inactive'}</span></td>
                    <td>{Number(s.daily_credit_limit).toLocaleString()}</td>
                    <td>{new Date(s.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
