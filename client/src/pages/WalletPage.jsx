import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authApi, getUser } from '../api'
import Loading from '../components/Loading'

const TYPE_CONFIG = {
  credit:       { label: 'Credit',   sign: '+', color: 'var(--success)' },
  debit:        { label: 'Debit',    sign: '-', color: 'var(--error)' },
  transfer_in:  { label: 'Received', sign: '+', color: 'var(--success)' },
  transfer_out: { label: 'Sent',     sign: '-', color: 'var(--error)' },
  bonus:        { label: 'Bonus',    sign: '+', color: 'var(--success)' },
}

export default function WalletPage() {
  const navigate = useNavigate()
  const [balances, setBalances] = useState([])
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState(null)

  useEffect(() => {
    if (!getUser()) {
      navigate('/login', { replace: true })
      return
    }
    fetchData()
  }, [])

  useEffect(() => {
    if (!loading) fetchHistory()
  }, [filter, page])

  async function fetchData() {
    try {
      const [balRes, histRes] = await Promise.all([
        authApi.get('/user/wallet/balances'),
        authApi.get('/user/wallet/history', { limit: 20 })
      ])
      setBalances(balRes.data.balances)
      setTransactions(histRes.data.data)
      setPagination(histRes.data.pagination)
    } catch (err) {
      console.error('Failed to load wallet:', err)
    } finally {
      setLoading(false)
    }
  }

  async function fetchHistory() {
    try {
      const params = { page, limit: 20 }
      if (filter) params.currency = filter
      const res = await authApi.get('/user/wallet/history', params)
      setTransactions(res.data.data)
      setPagination(res.data.pagination)
    } catch (err) {
      console.error('Failed to load history:', err)
    }
  }

  if (loading) return <div className="container"><Loading /></div>

  return (
    <div className="container animate-fade-in">
      <div className="page-header">
        <h1>Wallet</h1>
        <p className="page-subtitle">Your balances and transaction history</p>
      </div>

      {/* Balance Grid */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
        {balances.map(b => (
          <div className="stat-card" key={b.currency_id}>
            <div className="stat-label">{b.name}</div>
            <div className="stat-value">{Number(b.balance).toLocaleString()}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>{b.code}</div>
          </div>
        ))}
      </div>

      {/* Transaction History */}
      <section className="section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <h2>Transaction History</h2>
          <select
            value={filter}
            onChange={e => { setFilter(e.target.value); setPage(1) }}
            style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}
          >
            <option value="">All Currencies</option>
            {balances.map(b => (
              <option key={b.code} value={b.code}>{b.name}</option>
            ))}
          </select>
        </div>

        {transactions.length === 0 ? (
          <p className="text-muted">No transactions yet.</p>
        ) : (
          <>
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Currency</th>
                    <th style={{ textAlign: 'right' }}>Amount</th>
                    <th>Memo</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map(tx => {
                    const cfg = TYPE_CONFIG[tx.type] || TYPE_CONFIG.credit
                    return (
                      <tr key={tx.id}>
                        <td style={{ whiteSpace: 'nowrap' }}>{new Date(tx.created_at).toLocaleDateString()}</td>
                        <td>
                          <span className="badge" style={
                            cfg.sign === '+'
                              ? { background: 'rgba(0,184,148,0.15)', color: 'var(--success)' }
                              : { background: 'rgba(225,112,85,0.15)', color: 'var(--error)' }
                          }>
                            {cfg.label}
                          </span>
                        </td>
                        <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{tx.currency_code}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600, color: cfg.color }}>
                          {cfg.sign}{Number(tx.amount).toLocaleString()}
                        </td>
                        <td style={{ color: 'var(--text-muted)' }}>{tx.memo}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
                <button
                  className="btn btn-secondary"
                  disabled={page <= 1}
                  onClick={() => setPage(p => p - 1)}
                >Prev</button>
                <span style={{ padding: '8px 12px', color: 'var(--text-muted)' }}>
                  {page} / {pagination.totalPages}
                </span>
                <button
                  className="btn btn-secondary"
                  disabled={page >= pagination.totalPages}
                  onClick={() => setPage(p => p + 1)}
                >Next</button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  )
}
