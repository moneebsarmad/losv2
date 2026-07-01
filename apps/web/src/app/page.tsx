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
      <section className="auth-hero">
        <div className="brand-lockup">
          <div className="brand-mark">
            <img src={SCHOOL_CREST} alt="" />
          </div>
          <div>
            <p className="eyebrow">{SCHOOL_NAME}</p>
            <strong>{APP_NAME}</strong>
          </div>
        </div>
        <div>
          <h1>Recognition that builds house culture and 3R growth.</h1>
          <p>
            Staff notice meaningful moments, students strengthen their house, parents see approved growth, and
            Tarbiyah leaders can see who is being noticed.
          </p>
        </div>
      </section>

      <section className="auth-panel">
        <form className="auth-card" onSubmit={handleSubmit}>
          <div className="brand-lockup">
            <div className="brand-mark">
              <img src={SCHOOL_CREST} alt="" />
            </div>
            <div>
              <p className="eyebrow">Secure Portal</p>
              <strong>{APP_NAME}</strong>
            </div>
          </div>
          <h2>Sign in</h2>
          <p className="muted">Use your BHA account to continue.</p>

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

          <button className="btn btn-primary full" type="submit" disabled={loading || !email || !password}>
            {loading ? 'Signing in...' : 'Continue'}
            <ArrowRight size={18} />
          </button>
        </form>
      </section>
    </main>
  )
}
