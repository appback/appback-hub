import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ToastProvider } from './components/Toast'
import Nav from './components/Nav'
import Footer from './components/Footer'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import ProfilePage from './pages/ProfilePage'
import WalletPage from './pages/WalletPage'
import GamesPage from './pages/GamesPage'
import LeaderboardPage from './pages/LeaderboardPage'
import AdminPage from './pages/AdminPage'
import AuthCallbackPage from './pages/AuthCallbackPage'
import SponsorPage from './pages/SponsorPage'
import TransparencyPage from './pages/TransparencyPage'
import './styles.css'

const savedTheme = localStorage.getItem('theme') || 'dark'
document.documentElement.dataset.theme = savedTheme

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <Nav />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/wallet" element={<WalletPage />} />
            <Route path="/games" element={<GamesPage />} />
            <Route path="/leaderboard" element={<LeaderboardPage />} />
            <Route path="/sponsor" element={<SponsorPage />} />
            <Route path="/transparency" element={<TransparencyPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/auth/callback" element={<AuthCallbackPage />} />
          </Routes>
        </main>
        <Footer />
      </ToastProvider>
    </BrowserRouter>
  </React.StrictMode>
)
