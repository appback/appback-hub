import { Link } from 'react-router-dom'

export default function SponsorPage() {
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

      <div className="section" style={{ textAlign: 'center', marginTop: 32 }}>
        <p className="text-muted">
          All sponsorship records will be publicly visible on the{' '}
          <Link to="/transparency" style={{ color: 'var(--primary)' }}>Transparency</Link> page.
        </p>
      </div>
    </div>
  )
}
