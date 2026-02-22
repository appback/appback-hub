import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authApi, getUser, setAuth } from '../api'
import { useToast } from '../components/Toast'
import Loading from '../components/Loading'

export default function ProfilePage() {
  const navigate = useNavigate()
  const toast = useToast()
  const [user, setUser] = useState(null)
  const [links, setLinks] = useState([])
  const [loading, setLoading] = useState(true)
  const [linkForm, setLinkForm] = useState({ service: 'titleclash', service_user_id: '' })

  useEffect(() => {
    if (!getUser()) {
      navigate('/login', { replace: true })
      return
    }
    Promise.all([
      authApi.get('/auth/me'),
      authApi.get('/account/links')
    ])
      .then(([userRes, linksRes]) => {
        setUser(userRes.data.user)
        setLinks(linksRes.data.links)
      })
      .catch(() => toast.error('Failed to load profile'))
      .finally(() => setLoading(false))
  }, [])

  async function handleLink(e) {
    e.preventDefault()
    if (!linkForm.service_user_id.trim()) return
    try {
      const res = await authApi.post('/account/link', linkForm)
      setLinks(prev => [...prev, res.data.link])
      setLinkForm({ service: 'titleclash', service_user_id: '' })
      toast.success('Account linked!')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to link account')
    }
  }

  async function handleUnlink(service) {
    try {
      await authApi.delete(`/account/links/${service}`)
      setLinks(prev => prev.filter(l => l.service !== service))
      toast.success('Account unlinked')
    } catch (err) {
      toast.error('Failed to unlink account')
    }
  }

  if (loading) return <div className="container"><Loading /></div>

  return (
    <div className="container animate-fade-in">
      <div className="page-header">
        <h1>Profile</h1>
      </div>

      {user && (
        <div className="card">
          <div className="card-body" style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
            {user.avatar_url && (
              <img src={user.avatar_url} alt="" className="profile-avatar" />
            )}
            <div>
              <h2>{user.display_name || 'No display name'}</h2>
              <p className="text-muted">{user.email}</p>
              {user.github_username && (
                <p className="text-muted">GitHub: @{user.github_username}</p>
              )}
              <span className="badge">{user.role}</span>
            </div>
          </div>
        </div>
      )}

      <section className="section">
        <h2>Linked Accounts</h2>
        {links.length > 0 ? (
          <div className="card-list">
            {links.map(link => (
              <div key={link.id} className="card card-row">
                <div className="card-body">
                  <strong>{link.service}</strong>
                  <span className="text-muted" style={{ marginLeft: '12px' }}>ID: {link.service_user_id}</span>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => handleUnlink(link.service)}>Unlink</button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted">No linked accounts. Link your TitleClash or ClawClash account below.</p>
        )}

        <form onSubmit={handleLink} className="link-form">
          <select className="form-input" value={linkForm.service}
            onChange={e => setLinkForm(prev => ({ ...prev, service: e.target.value }))}>
            <option value="titleclash">TitleClash</option>
            <option value="clawclash">ClawClash</option>
          </select>
          <input className="form-input" type="text" placeholder="Your user ID in that service"
            value={linkForm.service_user_id}
            onChange={e => setLinkForm(prev => ({ ...prev, service_user_id: e.target.value }))} />
          <button className="btn btn-primary" type="submit">Link</button>
        </form>
      </section>
    </div>
  )
}
