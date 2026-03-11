import { useState } from 'react';
import { UserAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';

const Signin = () => {
  const { signInUser, signInWithGoogle } = UserAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await signInUser(email, password);
    if (!result.success) {
      setError(result.error || 'Sign in failed. Please check your credentials.');
    } else {
      navigate('/dashboard');
    }
    setLoading(false);
  };

  return (
    <div className="neu-page">
      {/* ── Left branding panel ── */}
      <div
        className="auth-panel-left"
        style={{ background: 'linear-gradient(160deg, #064e3b 0%, #022c22 100%)' }}
      >
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.07,
          backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)',
          backgroundSize: '28px 28px'
        }} />

        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '2.25rem', height: '2.25rem', background: 'rgba(255,255,255,0.15)',
            borderRadius: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
            </svg>
          </div>
          <span style={{ color: 'white', fontWeight: 800, fontSize: '1rem' }}>NEU MOA Management System</span>
        </div>

        <div style={{ position: 'relative' }}>
          <h2 style={{ color: 'white', fontSize: '2.25rem', fontWeight: 900, lineHeight: 1.2, margin: '0 0 1rem' }}>
            Memorandum of<br />Agreement Online Portal
          </h2>
          <p style={{ color: 'rgba(167,243,208,0.8)', fontSize: '0.9rem', lineHeight: 1.7, margin: 0 }}>
            An Online Management System for MOA documents for institutional partnerships — track, manage, and audit MOA lifecycles in one place.
          </p>
        </div>

        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          {[
            { icon: '🔒', text: 'Institutional domain-restricted access' },
            { icon: '📋', text: 'Full audit trail on every action' },
            { icon: '🏛️', text: 'Role-based permissions (Student · Staff · Admin)' },
          ].map(f => (
            <div key={f.text} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span>{f.icon}</span>
              <span style={{ color: 'rgba(167,243,208,0.75)', fontSize: '0.8rem' }}>{f.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="auth-panel-right">
        <div className="auth-form-container">
          <div style={{ marginBottom: '2.5rem' }}>
            <h1 style={{ fontSize: '1.875rem', fontWeight: 900, color: '#f1f5f9', margin: '0 0 0.5rem' }}>
              Welcome back
            </h1>
            <p style={{ color: '#64748b', fontSize: '0.875rem', margin: 0 }}>
              Sign in using your NEU institutional account
            </p>
          </div>

          {error && <div className="neu-error">{error}</div>}

          <form onSubmit={handleEmailLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
            <div>
              <label className="neu-label">Email Address</label>
              <input type="email" required placeholder="yourname@neu.edu.ph" className="neu-input" onChange={e => setEmail(e.target.value)} />
            </div>
            <div>
              <label className="neu-label">Password</label>
              <input type="password" required placeholder="••••••••" className="neu-input" onChange={e => setPassword(e.target.value)} />
            </div>
            <div style={{ paddingTop: '0.25rem' }}>
              <button type="submit" className="neu-btn-primary" disabled={loading}>
                {loading ? 'Signing in…' : 'Sign In'}
              </button>
            </div>
          </form>

          <div className="neu-divider">or</div>

          <div style={{ marginTop: '1.5rem' }}>
            <button className="neu-btn-secondary" onClick={signInWithGoogle}>
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google (@neu.edu.ph)
            </button>
          </div>

          <p style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.875rem', color: '#475569' }}>
            Don't have an account? <Link to="/signup">Sign Up</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signin;