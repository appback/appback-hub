import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { publicApi, authApi, getUser } from '../api'
import { useToast } from '../components/Toast'
import Loading from '../components/Loading'

export default function SponsorPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const [tiers, setTiers] = useState([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(null)

  useEffect(() => {
    publicApi.get('/sponsorship/tiers')
      .then(res => setTiers(res.data.tiers))
      .catch(() => toast.error('Failed to load tiers'))
      .finally(() => setLoading(false))
  }, [])

  async function handleSponsor(tier) {
    if (!getUser()) {
      navigate('/login', { replace: true })
      return
    }

    setProcessing(tier.id)
    try {
      const { data } = await authApi.post('/sponsorship/prepare', { tier_id: tier.id })

      // TODO: PG 연동 시 여기에서 PG SDK 호출
      // const paymentKey = await pgSDK.pay(data.amount)

      const result = await authApi.post('/sponsorship/confirm', { order_id: data.orderId })
      toast.success(`${Number(result.data.order.gem_reward).toLocaleString()} Gem received!`)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Sponsorship failed')
    } finally {
      setProcessing(null)
    }
  }

  if (loading) return <div className="container"><Loading /></div>

  return (
    <div className="container animate-fade-in">
      <div className="page-header">
        <h1>Sponsor</h1>
        <p className="page-subtitle">Support the platform and earn Gems</p>
      </div>

      <div className="tier-grid">
        {tiers.map(tier => (
          <div className="card tier-card" key={tier.id}>
            <div className="tier-amount">{Number(tier.amount).toLocaleString()}</div>
            <div className="tier-currency">KRW</div>
            <div className="tier-reward">
              <span className="tier-gem">{Number(tier.gem_reward).toLocaleString()} Gem</span>
              {tier.bonus_pct > 0 && (
                <span className="badge badge-bonus">+{tier.bonus_pct}% bonus</span>
              )}
            </div>
            <button
              className="btn btn-primary"
              style={{ width: '100%', marginTop: 16 }}
              disabled={processing === tier.id}
              onClick={() => handleSponsor(tier)}
            >
              {processing === tier.id ? 'Processing...' : 'Sponsor'}
            </button>
          </div>
        ))}
      </div>

      <div className="section" style={{ textAlign: 'center', marginTop: 32 }}>
        <p className="text-muted">
          All sponsorship records are publicly visible on the{' '}
          <a href="/transparency" style={{ color: 'var(--primary)' }}>Transparency</a> page.
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
