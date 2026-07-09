import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext.jsx'
import './Login.css'

function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [cred, setCred] = useState({
    email: 'test@test.com',
    password: '123456',
  })

  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    // Client-side validation
    if (!cred.email.trim() || !cred.password.trim()) {
      setError('Email and password are required.')
      return
    }

    try {
      const response = await fetch('http://localhost:8000/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cred),
      })

      if (!response.ok) {
        throw new Error('Invalid credentials')
      }

      const data = await response.json()

      login(data)
      navigate('/todos', { replace: true })
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="login">
      <div className="login-card">
        <div className="login-head">
          <h1>Welcome back</h1>
          <p>Sign in to continue to your account.</p>
        </div>

        {error && (
          <div className="login-banner" role="alert">
            <span className="login-banner-icon" aria-hidden="true">
              !
            </span>
            <span>{error}</span>
          </div>
        )}

        <form className="login-form" onSubmit={handleSubmit} noValidate>
          <div className="login-field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={cred.email}
              onChange={(e) => setCred({ ...cred, email: e.target.value })}
            />
          </div>

          <div className="login-field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={cred.password}
              onChange={(e) => setCred({ ...cred, password: e.target.value })}
            />
          </div>

          <button className="login-submit" type="submit">
            Log in
          </button>
        </form>
      </div>
    </div>
  )
}

export default Login
