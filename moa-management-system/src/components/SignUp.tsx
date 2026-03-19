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

const Signup = () => {
  const { signUpNewUser } = UserAuth();
  const [formData,    setFormData]    = useState({ email: '', password: '', confirmPassword: '', firstName: '', lastName: '' });
  const [showPass,    setShowPass]    = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState('');
  const navigate = useNavigate();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!formData.email.endsWith('@neu.edu.ph')) { setError('Only @neu.edu.ph institutional email addresses are allowed.'); return; }
    if (formData.password !== formData.confirmPassword) { setError('Passwords do not match.'); return; }
    if (formData.password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setLoading(true);
    const result = await signUpNewUser(formData.email, formData.password, formData.firstName, formData.lastName);
    if (!result.success) { setError(result.error?.message || 'Registration failed.'); }
    else { navigate('/signin'); }
    setLoading(false);
  };

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setFormData(prev => ({ ...prev, [field]: e.target.value }));

  const eyeBtnStyle = { position: 'absolute' as const, right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: '#6b7280', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '0.2rem', borderRadius: '4px', zIndex: 2, transition: 'color 0.15s' };

  return (
    <div className="neu-page">

      {/* ── Left panel ── */}
      <div className="auth-panel-left" style={{ background: 'linear-gradient(155deg, #064e3b 0%, #022c22 60%, #011a15 100%)' }}>
        <div style={{ position: 'absolute', inset: 0, opacity: 0.05, backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '32px 32px', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-10%', left: '-10%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <img src={neuLogo} alt="NEU" style={{ width: '2.75rem', height: '2.75rem', objectFit: 'contain', borderRadius: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }} />
          <div>
            <div style={{ color: 'white', fontWeight: 800, fontSize: '0.95rem', letterSpacing: '-0.02em', lineHeight: 1.2 }}>NEU MOA System</div>
            <div style={{ color: 'rgba(167,243,208,0.6)', fontSize: '0.7rem', fontWeight: 500 }}>Management Portal</div>
          </div>
        </div>

        <div style={{ position: 'relative' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'rgba(167,243,208,0.6)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '0.875rem' }}>New Era University</div>
          <h2 style={{ color: 'white', fontSize: '2.5rem', fontWeight: 900, lineHeight: 1.15, margin: '0 0 1.25rem', letterSpacing: '-0.03em' }}>
            Join the MOA<br />Portal
          </h2>
          <p style={{ color: 'rgba(167,243,208,0.7)', fontSize: '0.9rem', lineHeight: 1.75, margin: 0, maxWidth: '320px' }}>
            Register your institutional account to manage MOA documents and track partnership lifecycles.
          </p>
        </div>

        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {[
            { icon: '🔑', text: 'Requires an official @neu.edu.ph email' },
            { icon: '📁', text: 'Track MOA status from draft to completion' },
            { icon: '📊', text: 'Every action is logged for compliance' },
          ].map(f => (
            <div key={f.text} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0.75rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
              <span style={{ fontSize: '1rem', flexShrink: 0 }}>{f.icon}</span>
              <span style={{ color: 'rgba(167,243,208,0.8)', fontSize: '0.82rem', fontWeight: 500 }}>{f.text}</span>
            </div>
          ))}
        </div>

        <div style={{ position: 'relative', color: 'rgba(167,243,208,0.25)', fontSize: '0.72rem' }}>
          © {new Date().getFullYear()} New Era University · All rights reserved
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="auth-panel-right" style={{ position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, zIndex: 0, backgroundImage: `url(${neuBg})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(3px) brightness(0.4)', transform: 'scale(1.05)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', inset: 0, zIndex: 1, background: 'radial-gradient(ellipse at center, rgba(3,7,18,0.2) 0%, rgba(3,7,18,0.55) 100%)', pointerEvents: 'none' }} />

        <div className="auth-form-container animate-fade-in" style={{ position: 'relative', zIndex: 2, maxWidth: '420px', background: 'rgba(13,20,36,0.88)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '2.25rem 2.25rem', boxShadow: '0 32px 80px rgba(0,0,0,0.55)' }}>

          <div style={{ marginBottom: '1.75rem' }}>
            <h1 style={{ fontSize: '1.625rem', fontWeight: 800, color: '#f9fafb', margin: '0 0 0.375rem', letterSpacing: '-0.025em' }}>Create Account</h1>
            <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: 0 }}>Register with your NEU institutional email</p>
          </div>

          {error && <div className="neu-error">{error}</div>}

          <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: '0.95rem' }}>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label className="neu-label">First Name</label>
                <input required placeholder="Juan" className="neu-input" onChange={set('firstName')} />
              </div>
              <div>
                <label className="neu-label">Last Name</label>
                <input required placeholder="dela Cruz" className="neu-input" onChange={set('lastName')} />
              </div>
            </div>

            <div>
              <label className="neu-label">Institutional Email</label>
              <input type="email" required placeholder="yourname@neu.edu.ph" className="neu-input" onChange={set('email')} />
              <p style={{ margin: '0.375rem 0 0', fontSize: '0.72rem', color: '#4b5563', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <span>ℹ</span> Must end in @neu.edu.ph
              </p>
            </div>

            <div>
              <label className="neu-label">Password</label>
              <div style={{ position: 'relative' }}>
                <input type={showPass ? 'text' : 'password'} required placeholder="Min. 6 characters" className="neu-input" style={{ paddingRight: '2.75rem' }} onChange={set('password')} />
                <button type="button" onClick={() => setShowPass(p => !p)} style={eyeBtnStyle}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#9ca3af'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#6b7280'; }}>
                  {showPass ? <EyeOff /> : <EyeOpen />}
                </button>
              </div>
            </div>

            <div>
              <label className="neu-label">Confirm Password</label>
              <div style={{ position: 'relative' }}>
                <input type={showConfirm ? 'text' : 'password'} required placeholder="Re-enter password" className="neu-input" style={{ paddingRight: '2.75rem' }} onChange={set('confirmPassword')} />
                <button type="button" onClick={() => setShowConfirm(p => !p)} style={eyeBtnStyle}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#9ca3af'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#6b7280'; }}>
                  {showConfirm ? <EyeOff /> : <EyeOpen />}
                </button>
              </div>
            </div>

            <button type="submit" className="neu-btn-primary" disabled={loading} style={{ marginTop: '0.25rem' }}>
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  <span style={{ width: '1rem', height: '1rem', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
                  Creating Account…
                </span>
              ) : 'Create Account'}
            </button>
          </form>

          <p style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.875rem', color: '#6b7280' }}>
            Already have an account?{' '}
            <Link to="/signin" style={{ color: '#34d399', fontWeight: 700 }}>Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;