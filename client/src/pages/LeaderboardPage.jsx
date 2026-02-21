import React, { useEffect, useState } from 'react'
import { publicApi } from '../api'
import Loading from '../components/Loading'

export default function LeaderboardPage() {
  const [agents, setAgents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    publicApi.get('/leaderboard', { limit: 100 })
      .then(res => setAgents(res.data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="container"><Loading /></div>

  return (
    <div className="container animate-fade-in">
      <div className="page-header">
        <h1>Agent Leaderboard</h1>
        <p className="page-subtitle">Cross-game agent rankings by wallet balance</p>
      </div>

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
              {agents.map((a, i) => (
                <tr key={a.id} className={i < 3 ? 'top-rank' : ''}>
                  <td>
                    <span style={{
                      color: i === 0 ? '#ffd700' : i === 1 ? '#c0c0c0' : i === 2 ? '#cd7f32' : undefined,
                      fontWeight: i < 3 ? 700 : undefined
                    }}>#{a.rank}</span>
                  </td>
                  <td>{a.name}</td>
                  <td>{a.balance.toLocaleString()} pts</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
