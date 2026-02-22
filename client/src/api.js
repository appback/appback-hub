import axios from 'axios'

const api = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' }
})

export const authApi = {
  _headers() {
    const token = localStorage.getItem('hub_token')
    return token ? { Authorization: 'Bearer ' + token } : {}
  },
  get(url, params) {
    return api.get(url, { headers: this._headers(), params })
  },
  post(url, data) {
    return api.post(url, data, { headers: this._headers() })
  },
  delete(url) {
    return api.delete(url, { headers: this._headers() })
  }
}

export const publicApi = {
  get(url, params) {
    return api.get(url, { params })
  },
  post(url, data) {
    return api.post(url, data)
  }
}

export function getUser() {
  const raw = localStorage.getItem('hub_user')
  return raw ? JSON.parse(raw) : null
}

export function getToken() {
  return localStorage.getItem('hub_token')
}

export function setAuth(token, user) {
  localStorage.setItem('hub_token', token)
  localStorage.setItem('hub_user', JSON.stringify(user))
  window.dispatchEvent(new Event('hub-auth-change'))
}

export function clearAuth() {
  localStorage.removeItem('hub_token')
  localStorage.removeItem('hub_user')
  window.dispatchEvent(new Event('hub-auth-change'))
}

export default api
