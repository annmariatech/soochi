import { useState } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { login } from "../api"

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [contact, setContact] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setLoading(true)
    setError("")
    try {
      await login({ contact, password })
      navigate(location.state?.from || "/inventory", { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="auth-page">
      <section className="other-paper gingham">
        <form className="other-inner auth-card" onSubmit={handleSubmit}>
          <span className="eyebrow">WELCOME BACK, MAKER</span>
          <h1>Log in to your scrap basket.</h1>
          <p>Log in to your account to see your saved scraps and requests.</p>
          <label>
            Contact number
            <input
              value={contact}
              onChange={(event) => setContact(event.target.value)}
              inputMode="numeric"
              autoComplete="tel"
              aria-label="Contact number"
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
          </label>
          {error && <p className="error-note">{error}</p>}
          <button className="primary-button" disabled={loading}>
            {loading ? "Opening the basket…" : "Enter Soochi"}
          </button>
          <p className="auth-switch">
            New here? <Link to="/signup">Create an account</Link>
          </p>
        </form>
      </section>
    </main>
  )
}
