import { useState } from 'react';
import { UserAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import neuLogo from '../assets/neu_logo_placeholder.png';
import neuBg from '../assets/neu-bg-placeholder.jpg';

const EyeOpen = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
  </svg>
);
const EyeOff = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);

const Signin = () => {
  const { signInUser, signInWithGoogle } = UserAuth();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
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
      <div className="auth-panel-left" style={{ background: 'linear-gradient(155deg, #064e3b 0%, #022c22 60%, #011a15 100%)' }}>
        {/* Subtle grid texture */}
        <div style={{ position: 'absolute', inset: 0, opacity: 0.05, backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '32px 32px', pointerEvents: 'none' }} />
        {/* Glow orb */}
        <div style={{ position: 'absolute', top: '-20%', right: '-10%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(16,185,129,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />

        {/* Logo */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <img src={neuLogo} alt="NEU" style={{ width: '2.75rem', height: '2.75rem', objectFit: 'contain', borderRadius: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }} />
          <div>
            <div style={{ color: 'white', fontWeight: 800, fontSize: '0.95rem', letterSpacing: '-0.02em', lineHeight: 1.2 }}>NEU MOA System</div>
            <div style={{ color: 'rgba(167,243,208,0.6)', fontSize: '0.7rem', fontWeight: 500 }}>Management Portal</div>
          </div>
        </div>

        {/* Headline */}
        <div style={{ position: 'relative' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'rgba(167,243,208,0.6)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '0.875rem' }}>
            New Era University
          </div>
          <h2 style={{ color: 'white', fontSize: '2.5rem', fontWeight: 900, lineHeight: 1.15, margin: '0 0 1.25rem', letterSpacing: '-0.03em' }}>
            Memorandum of<br />Agreement Portal
          </h2>
          <p style={{ color: 'rgba(167,243,208,0.7)', fontSize: '0.9rem', lineHeight: 1.75, margin: 0, maxWidth: '320px' }}>
            Manage institutional partnerships, track MOA lifecycles, and maintain a complete audit record — all in one secure platform.
          </p>
        </div>

        {/* Features */}
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {[
            { icon: '🔒', text: 'Restricted to @neu.edu.ph accounts' },
            { icon: '📋', text: 'Complete audit trail on every action' },
            { icon: '🏛️', text: 'Student · Staff · Admin permissions' },
          ].map(f => (
            <div key={f.text} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0.75rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', backdropFilter: 'blur(4px)' }}>
              <span style={{ fontSize: '1rem', flexShrink: 0 }}>{f.icon}</span>
              <span style={{ color: 'rgba(167,243,208,0.8)', fontSize: '0.82rem', fontWeight: 500 }}>{f.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="auth-panel-right" style={{ position: 'relative', overflow: 'hidden' }}>
        {/* BG image */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 0, backgroundImage: `url(${neuBg})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(3px) brightness(0.4)', transform: 'scale(1.05)', pointerEvents: 'none' }} />
        {/* Vignette */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 1, background: 'radial-gradient(ellipse at center, rgba(3,7,18,0.2) 0%, rgba(3,7,18,0.55) 100%)', pointerEvents: 'none' }} />

        {/* Form card */}
        <div className="auth-form-container animate-fade-in" style={{ position: 'relative', zIndex: 2, background: 'rgba(13,20,36,0.88)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '2.5rem 2.25rem', boxShadow: '0 32px 80px rgba(0,0,0,0.55)' }}>

          <div style={{ marginBottom: '2rem' }}>
            <h1 style={{ fontSize: '1.625rem', fontWeight: 800, color: '#f9fafb', margin: '0 0 0.375rem', letterSpacing: '-0.025em' }}>Welcome back</h1>
            <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: 0 }}>Sign in with your NEU institutional account</p>
          </div>

          {error && <div className="neu-error">{error}</div>}

          <form onSubmit={handleEmailLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem', marginBottom: '1.5rem' }}>
            <div>
              <label className="neu-label">Email Address</label>
              <input type="email" required placeholder="yourname@neu.edu.ph" className="neu-input" onChange={e => setEmail(e.target.value)} />
            </div>

            <div>
              <label className="neu-label">Password</label>
              <div style={{ position: 'relative' }}>
                <input type={showPass ? 'text' : 'password'} required placeholder="••••••••" className="neu-input" style={{ paddingRight: '2.75rem' }} onChange={e => setPassword(e.target.value)} />
                <button type="button" onClick={() => setShowPass(p => !p)}
                  style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: '#6b7280', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '0.2rem', borderRadius: '4px', zIndex: 2, transition: 'color 0.15s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#9ca3af'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#6b7280'; }}>
                  {showPass ? <EyeOff /> : <EyeOpen />}
                </button>
              </div>
            </div>

            <button type="submit" className="neu-btn-primary" disabled={loading} style={{ marginTop: '0.25rem' }}>
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  <span style={{ width: '1rem', height: '1rem', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
                  Signing in…
                </span>
              ) : 'Sign In'}
            </button>
          </form>

          <div className="neu-divider">or continue with</div>

          <button className="neu-btn-secondary" onClick={signInWithGoogle} style={{ marginTop: '1.25rem' }}>
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Google (@neu.edu.ph)
          </button>

          <p style={{ marginTop: '1.75rem', textAlign: 'center', fontSize: '0.875rem', color: '#6b7280' }}>
            Don't have an account?{' '}
            <Link to="/signup" style={{ color: '#34d399', fontWeight: 700 }}>Create one</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signin;