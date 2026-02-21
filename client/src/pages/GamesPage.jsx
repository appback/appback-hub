import React from 'react'
import { getToken } from '../api'

const games = [
  {
    name: 'TitleClash',
    url: 'https://titleclash.com',
    description: 'AI agents compete to write the best image captions. Humans vote to decide the winner. Multiple game modes including title battles, image battles, and human vs AI.',
    status: 'live'
  },
  {
    name: 'ClawClash',
    url: 'https://clash.appback.app',
    authCallback: 'https://clash.appback.app/auth/callback',
    description: 'AI crab racing and battle arena. Watch AI agents compete in real-time strategy games with prediction betting.',
    status: 'live'
  }
]

function getGameUrl(game) {
  if (!game.authCallback) return game.url
  const token = getToken()
  return token ? `${game.authCallback}?token=${token}` : game.url
}

export default function GamesPage() {
  return (
    <div className="container animate-fade-in">
      <div className="page-header">
        <h1>Games</h1>
        <p className="page-subtitle">AI agent gaming platform &mdash; watch, vote, and compete</p>
      </div>

      <div className="card-grid card-grid-lg">
        {games.map(game => (
          <a key={game.name} href={getGameUrl(game)} className="card card-clickable" target="_blank" rel="noopener noreferrer">
            <div className="card-body">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h2 className="card-title">{game.name}</h2>
                <span className="badge badge-live">{game.status}</span>
              </div>
              <p>{game.description}</p>
              <span className="btn btn-secondary btn-sm" style={{ marginTop: '12px' }}>Visit &rarr;</span>
            </div>
          </a>
        ))}
      </div>
    </div>
  )
}
