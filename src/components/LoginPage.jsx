import { useState } from 'react'
import { ArrowLeft, ArrowRight, Eye, EyeOff, LockKeyhole, Mail } from 'lucide-react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import Brand from './Brand.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { getErrorMessage } from '../api.js'

export default function LoginPage() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const [visible, setVisible] = useState(false)
  const [form, setForm] = useState({ identifier: '', password: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  if (user) return <Navigate to="/portal" replace />

  async function submit(event) {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      const account = await login(form)
      navigate(account.role === 'admin' ? '/portal' : '/portal/student', { replace: true })
    } catch (requestError) {
      setError(getErrorMessage(requestError))
    } finally {
      setBusy(false)
    }
  }

  return <main className="login-screen"><div className="login-visual"><Link to="/" className="login-back"><ArrowLeft size={16} /> Back to JMR</Link><div className="login-visual-content"><Brand light /><div className="login-quote"><span className="eyebrow eyebrow-gold"><span className="eyebrow-line" />A place to belong</span><h1>Good to have<br />you <em>back.</em></h1><p>Your JMR community is just a sign in away.</p></div><small className="login-photo-credit">JERRY MANUEL RESIDENCE · EST. WITH CARE</small></div></div><section className="login-panel"><div className="login-form-wrap"><Link to="/" className="login-mobile-brand"><Brand /></Link><span className="eyebrow"><span className="eyebrow-line" />YOUR RESIDENT PORTAL</span><h2>Welcome back</h2><p className="login-lede">Sign in to pick up where you left off.</p><form onSubmit={submit} className="login-form"><label htmlFor="identifier">Email or username</label><div className="input-wrap"><Mail size={17} /><input id="identifier" autoComplete="username" value={form.identifier} onChange={e => setForm({ ...form, identifier: e.target.value })} placeholder="you@example.com" required /></div><label htmlFor="password">Password</label><div className="input-wrap"><LockKeyhole size={17} /><input id="password" type={visible ? 'text' : 'password'} autoComplete="current-password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Enter your password" required /><button type="button" className="icon-button password-toggle" aria-label={visible ? 'Hide password' : 'Show password'} onClick={() => setVisible(!visible)}>{visible ? <EyeOff size={17} /> : <Eye size={17} />}</button></div>{error && <div className="form-error" role="alert">{error}</div>}<button className="button button-navy login-submit" type="submit" disabled={busy}>{busy ? <span className="spinner" /> : <>Sign in securely <ArrowRight size={17} /></>}</button></form><div className="login-security"><LockKeyhole size={14} /><span>Your account is protected with secure, encrypted sign-in.</span></div><p className="login-help">Need a hand? <a href="mailto:hello@jmr-residence.in">Contact resident support</a></p></div></section></main>
}
