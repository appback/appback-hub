import React, { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { authApi, setAuth } from '../api'
import Loading from '../components/Loading'

export default function AuthCallbackPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  useEffect(() => {
    const token = searchParams.get('token')
    if (!token) {
      navigate('/login', { replace: true })
      return
    }

    // Temporarily store token to use authApi
    localStorage.setItem('hub_token', token)
    authApi.get('/auth/me')
      .then(res => {
        setAuth(token, res.data.user)
        navigate('/', { replace: true })
      })
      .catch(() => {
        localStorage.removeItem('hub_token')
        navigate('/login', { replace: true })
      })
  }, [searchParams, navigate])

  return (
    <div className="container">
      <Loading message="Signing you in..." />
    </div>
  )
}
