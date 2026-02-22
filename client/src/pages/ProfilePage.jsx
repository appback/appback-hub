import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authApi, getUser } from '../api'
import { useToast } from '../components/Toast'
import Loading from '../components/Loading'

export default function ProfilePage() {
  const navigate = useNavigate()
  const toast = useToast()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!getUser()) {
      navigate('/login', { replace: true })
      return
    }
    authApi.get('/auth/me')
      .then(res => setUser(res.data.user))
      .catch(() => toast.error('Failed to load profile'))
      .finally(() => setLoading(false))
  }, [])

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
    </div>
  )
}
