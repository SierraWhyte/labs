import { FormEvent, useState } from 'react'
import { runAuthAction, useAuth } from './useAuth'

export default function AuthPage() {
  const { login, register } = useAuth()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      await runAuthAction(async () => {
        if (mode === 'signin') await login(email, password)
        else await register(email, password)
      }, setError)
    } catch {
      // error shown via setError
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="welcome-icon">✓</div>
          <h1>Checker</h1>
          <p className="subtitle">
            {mode === 'signin'
              ? 'Sign in to manage your checklists'
              : 'Create an account to get started'}
          </p>
        </div>

        {error && (
          <div className="status-banner error" role="alert">
            {error}
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            Email
            <input
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              autoComplete={
                mode === 'signin' ? 'current-password' : 'new-password'
              }
              placeholder={mode === 'signup' ? 'At least 8 characters' : ''}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={mode === 'signup' ? 8 : undefined}
              required
            />
          </label>
          <button type="submit" disabled={submitting}>
            {submitting
              ? 'Please wait…'
              : mode === 'signin'
                ? 'Sign in'
                : 'Create account'}
          </button>
        </form>

        <p className="auth-toggle">
          {mode === 'signin' ? (
            <>
              No account?{' '}
              <button
                type="button"
                className="link-button"
                onClick={() => {
                  setMode('signup')
                  setError(null)
                }}
              >
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button
                type="button"
                className="link-button"
                onClick={() => {
                  setMode('signin')
                  setError(null)
                }}
              >
                Sign in
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  )
}
