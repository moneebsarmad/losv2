'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight } from 'lucide-react'
import { useAuth } from './providers'
import { APP_NAME, SCHOOL_CREST, SCHOOL_NAME } from '@/lib/constants/formation'

export default function LoginPage() {
  const router = useRouter()
  const { loading, signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage(null)
    const error = await signIn(email, password)
    if (error) {
      setMessage(error)
      return
    }
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <main className="auth-page">
      <div className="auth-brand">
        <div className="auth-crest">
          <img src={SCHOOL_CREST} alt={SCHOOL_NAME} />
        </div>
        <div className="auth-brand-copy">
          <p className="eyebrow auth-eyebrow">{SCHOOL_NAME}</p>
          <strong className="auth-title">{APP_NAME}</strong>
        </div>
      </div>

      <div className="auth-glass-panel">
        <form className="auth-card" onSubmit={handleSubmit}>
          <h2>Welcome back</h2>
          <p className="auth-subtitle">Sign in to recognize meaningful moments and track 3R growth.</p>

          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              className="input"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>

          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              className="input"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>

          {message ? <div className="error">{message}</div> : null}

          <button className="btn btn-gold full" type="submit" disabled={loading || !email || !password}>
            {loading ? 'Signing in...' : 'Continue'}
            <ArrowRight size={18} />
          </button>
        </form>
      </div>
    </main>
  )
}
