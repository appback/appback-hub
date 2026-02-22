import { useEffect, useState } from 'react'
import { publicApi } from '../api'
import Loading from '../components/Loading'

export default function TransparencyPage() {
  const [summary, setSummary] = useState(null)
  const [sponsors, setSponsors] = useState([])
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [sponPage, setSponPage] = useState(1)
  const [sponPagination, setSponPagination] = useState(null)
  const [expPage, setExpPage] = useState(1)
  const [expPagination, setExpPagination] = useState(null)

  useEffect(() => {
    Promise.all([
      publicApi.get('/sponsorship/public/summary'),
      publicApi.get('/sponsorship/public/history', { limit: 20 }),
      publicApi.get('/sponsorship/public/expenses', { limit: 20 })
    ]).then(([sumRes, sponRes, expRes]) => {
      setSummary(sumRes.data)
      setSponsors(sponRes.data.data)
      setSponPagination(sponRes.data.pagination)
      setExpenses(expRes.data.data)
      setExpPagination(expRes.data.pagination)
    }).catch(err => {
      console.error('Failed to load transparency data:', err)
    }).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (loading) return
    publicApi.get('/sponsorship/public/history', { page: sponPage, limit: 20 })
      .then(res => {
        setSponsors(res.data.data)
        setSponPagination(res.data.pagination)
      })
  }, [sponPage])

  useEffect(() => {
    if (loading) return
    publicApi.get('/sponsorship/public/expenses', { page: expPage, limit: 20 })
      .then(res => {
        setExpenses(res.data.data)
        setExpPagination(res.data.pagination)
      })
  }, [expPage])

  if (loading) return <div className="container"><Loading /></div>

  const fmt = n => Number(n).toLocaleString()
  const fmtDate = d => new Date(d).toLocaleDateString()

  return (
    <div className="container animate-fade-in">
      <div className="page-header">
        <h1>Transparency</h1>
        <p className="page-subtitle">All sponsorship and expense records are public</p>
      </div>

      {summary && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">Total Sponsored</div>
            <div className="stat-value" style={{ color: 'var(--success)' }}>
              {fmt(summary.totalSponsored)}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Total Expenses</div>
            <div className="stat-value" style={{ color: 'var(--error)' }}>
              {fmt(summary.totalExpenses)}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Remaining</div>
            <div className="stat-value">
              {fmt(summary.remaining)}
            </div>
          </div>
        </div>
      )}

      <div className="section">
        <h2>Sponsorship History</h2>
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Sponsor</th>
                <th style={{ textAlign: 'right' }}>Amount (KRW)</th>
                <th style={{ textAlign: 'right' }}>Gem</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {sponsors.length === 0 ? (
                <tr><td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No sponsorships yet</td></tr>
              ) : sponsors.map((s, i) => (
                <tr key={i}>
                  <td>{s.display_name || 'Anonymous'}</td>
                  <td style={{ textAlign: 'right' }}>{fmt(s.amount)}</td>
                  <td style={{ textAlign: 'right' }}>{fmt(s.gem_reward)}</td>
                  <td>{fmtDate(s.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {sponPagination && sponPagination.totalPages > 1 && (
          <Pagination current={sponPage} total={sponPagination.totalPages} onChange={setSponPage} />
        )}
      </div>

      <div className="section">
        <h2>Platform Expenses</h2>
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Category</th>
                <th style={{ textAlign: 'right' }}>Amount (KRW)</th>
                <th>Description</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {expenses.length === 0 ? (
                <tr><td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No expenses recorded</td></tr>
              ) : expenses.map((e, i) => (
                <tr key={i}>
                  <td><span className="badge">{e.category}</span></td>
                  <td style={{ textAlign: 'right' }}>{fmt(e.amount)}</td>
                  <td>{e.description || '-'}</td>
                  <td>{fmtDate(e.expense_date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {expPagination && expPagination.totalPages > 1 && (
          <Pagination current={expPage} total={expPagination.totalPages} onChange={setExpPage} />
        )}
      </div>
    </div>
  )
}

function Pagination({ current, total, onChange }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 12 }}>
      <button className="btn btn-ghost btn-sm" disabled={current <= 1} onClick={() => onChange(current - 1)}>Prev</button>
      <span style={{ lineHeight: '32px', color: 'var(--text-muted)' }}>{current} / {total}</span>
      <button className="btn btn-ghost btn-sm" disabled={current >= total} onClick={() => onChange(current + 1)}>Next</button>
    </div>
  )
}
