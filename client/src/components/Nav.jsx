import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getUser, clearAuth } from '../api'

export default function Nav() {
  const navigate = useNavigate()
  const [user, setUser] = useState(getUser())

  useEffect(() => {
    function onChange() { setUser(getUser()) }
    window.addEventListener('hub-auth-change', onChange)
    return () => window.removeEventListener('hub-auth-change', onChange)
  }, [])

  function handleLogout() {
    clearAuth()
    navigate('/')
  }

  return (
    <nav className="nav">
      <div className="nav-inner">
        <Link to="/" className="nav-brand">Appback Hub</Link>
        <div className="nav-links">
          <Link to="/games">Games</Link>
          <Link to="/leaderboard">Leaderboard</Link>
          {user ? (
            <>
              <Link to="/wallet">Wallet</Link>
              <Link to="/profile">
                {user.avatar_url
                  ? <img src={user.avatar_url} alt="" className="nav-avatar" />
                  : (user.display_name || user.email)}
              </Link>
              <button className="btn btn-ghost btn-sm" onClick={handleLogout}>Logout</button>
            </>
          ) : (
            <Link to="/login" className="btn btn-primary btn-sm">Login</Link>
          )}
        </div>
      </div>
    </nav>
  )
}
