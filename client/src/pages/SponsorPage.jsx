import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { publicApi } from '../api'
import Loading from '../components/Loading'

export default function SponsorPage() {
  const [tiers, setTiers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    publicApi.get('/sponsorship/tiers')
      .then(res => setTiers(res.data.tiers))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="container"><Loading /></div>

  return (
    <div className="container animate-fade-in">
      <div className="page-header">
        <h1>Sponsor</h1>
        <p className="page-subtitle">Support the platform and earn Gems</p>
      </div>

      <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
        <p style={{ fontSize: '2.5rem', marginBottom: 8 }}>Coming Soon</p>
        <p className="text-muted">Payment integration is being prepared. Stay tuned!</p>
      </div>

      <div className="tier-grid">
        {tiers.map(tier => (
          <div className="card tier-card" key={tier.id} style={{ opacity: 0.6 }}>
            <div className="tier-amount">{Number(tier.amount).toLocaleString()}</div>
            <div className="tier-currency">KRW</div>
            <div className="tier-reward">
              <span className="tier-gem">{Number(tier.gem_reward).toLocaleString()} Gem</span>
              {tier.bonus_pct > 0 && (
                <span className="badge badge-bonus">+{tier.bonus_pct}% bonus</span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="section" style={{ textAlign: 'center', marginTop: 32 }}>
        <p className="text-muted">
          All sponsorship records are publicly visible on the{' '}
          <Link to="/transparency" style={{ color: 'var(--primary)' }}>Transparency</Link> page.
        </p>
      </div>

      <style>{`
        .tier-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 16px;
          margin-top: 24px;
        }
        .tier-card {
          text-align: center;
          padding: 24px 16px;
        }
        .tier-amount {
          font-size: 2rem;
          font-weight: 700;
          color: var(--primary);
        }
        .tier-currency {
          font-size: 0.85rem;
          color: var(--text-muted);
          margin-bottom: 12px;
        }
        .tier-reward {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        .tier-gem {
          font-size: 1.1rem;
          font-weight: 600;
        }
        .badge-bonus {
          background: var(--success);
          color: #fff;
          padding: 2px 8px;
          border-radius: var(--radius-sm);
          font-size: 0.75rem;
        }
      `}</style>
    </div>
  )
}
