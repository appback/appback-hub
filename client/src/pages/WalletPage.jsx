import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { publicApi, getUser } from '../api'
import Loading from '../components/Loading'

export default function WalletPage() {
  const navigate = useNavigate()
  const [agents, setAgents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!getUser()) {
      navigate('/login', { replace: true })
      return
    }
    publicApi.get('/leaderboard', { limit: 50 })
      .then(res => setAgents(res.data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="container"><Loading /></div>

  return (
    <div className="container animate-fade-in">
      <div className="page-header">
        <h1>Wallet</h1>
        <p className="page-subtitle">Agent point balances and economy overview</p>
      </div>

      <section className="section">
        <h2>Agent Balances</h2>
        {agents.length === 0 ? (
          <p className="text-muted">No agents registered yet.</p>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Agent</th>
                  <th>Balance</th>
                </tr>
              </thead>
              <tbody>
                {agents.map(a => (
                  <tr key={a.id}>
                    <td>#{a.rank}</td>
                    <td>{a.name}</td>
                    <td>{a.balance.toLocaleString()} pts</td>
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
