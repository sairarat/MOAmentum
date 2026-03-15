import { useState } from 'react';
import { UserAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import neuLogo from '../assets/neu_logo_placeholder.png';
import neuBg from '../assets/neu-bg-placeholder.jpg';

const Signup = () => {
  const { signUpNewUser } = UserAuth();
  const [formData, setFormData] = useState({ email: '', password: '', confirmPassword: '', firstName: '', lastName: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!formData.email.endsWith('@neu.edu.ph')) {
      setError('Only @neu.edu.ph institutional email addresses are allowed.');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    const result = await signUpNewUser(formData.email, formData.password, formData.firstName, formData.lastName);
    if (!result.success) {
      setError(result.error?.message || 'Registration failed.');
    } else {
      navigate('/signin');
    }
    setLoading(false);
  };

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setFormData(prev => ({ ...prev, [field]: e.target.value }));

  return (
    <div className="neu-page">

      {/* ── Left branding panel — matches SignIn ── */}
      <div
        className="auth-panel-left"
        style={{ background: 'linear-gradient(160deg, #064e3b 0%, #022c22 100%)' }}
      >
        {/* Dot grid texture */}
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.07,
          backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }} />

        {/* Logo + wordmark */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <img
            src={neuLogo}
            alt="NEU Logo"
            style={{ width: '2.5rem', height: '2.5rem', objectFit: 'contain', borderRadius: '0.5rem' }}
          />
          <span style={{ color: 'white', fontWeight: 800, fontSize: '1rem' }}>
            NEU MOA Management System
          </span>
        </div>

        {/* Headline */}
        <div style={{ position: 'relative' }}>
          <h2 style={{ color: 'white', fontSize: '2.25rem', fontWeight: 900, lineHeight: 1.2, margin: '0 0 1rem' }}>
            Join the MOA<br />Management Portal
          </h2>
          <p style={{ color: 'rgba(167,243,208,0.8)', fontSize: '0.9rem', lineHeight: 1.7, margin: 0 }}>
            Register with your institutional NEU account to start tracking and managing Memoranda of Agreement.
          </p>
        </div>

        {/* Feature list */}
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          {[
            { icon: '🔑', text: 'Requires an official @neu.edu.ph email' },
            { icon: '📁', text: 'Track MOA status from draft to completion' },
            { icon: '📊', text: 'Every action is logged for compliance' },
          ].map(f => (
            <div key={f.text} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span>{f.icon}</span>
              <span style={{ color: 'rgba(167,243,208,0.75)', fontSize: '0.8rem' }}>{f.text}</span>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ position: 'relative', color: 'rgba(167,243,208,0.3)', fontSize: '0.72rem' }}>
          © {new Date().getFullYear()} New Era University · All rights reserved
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div
        className="auth-panel-right"
        style={{ position: 'relative', overflow: 'hidden' }}
      >
        {/* Background image — dark + blurred */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `url(${neuBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'blur(3px) brightness(0.45)',
          transform: 'scale(1.05)',
        }} />

        {/* Dark vignette */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse at center, rgba(2,8,23,0.15) 0%, rgba(2,8,23,0.45) 100%)',
        }} />

        {/* Form card */}
        <div
          className="auth-form-container"
          style={{
            position: 'relative', zIndex: 2,
            maxWidth: '420px',
            background: 'rgba(15,23,42,0.82)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: '1.25rem',
            padding: '2.25rem 2rem',
            boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
          }}
        >
          <div style={{ marginBottom: '1.75rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#f1f5f9', margin: '0 0 0.4rem' }}>
              Create Account
            </h1>
            <p style={{ color: '#64748b', fontSize: '0.875rem', margin: 0 }}>
              Register with your NEU institutional email
            </p>
          </div>

          {error && <div className="neu-error">{error}</div>}

          <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
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
              <input
                type="email" required placeholder="yourname@neu.edu.ph"
                className="neu-input"
                onChange={set('email')}
              />
              <p style={{ marginTop: '0.3rem', fontSize: '0.72rem', color: '#475569' }}>
                Must be an @neu.edu.ph address
              </p>
            </div>

            <div>
              <label className="neu-label">Password</label>
              <input
                type="password" required placeholder="Minimum 6 characters"
                className="neu-input"
                onChange={set('password')}
              />
            </div>

            <div>
              <label className="neu-label">Confirm Password</label>
              <input
                type="password" required placeholder="Re-enter password"
                className="neu-input"
                onChange={set('confirmPassword')}
              />
            </div>

            <div style={{ paddingTop: '0.25rem' }}>
              <button type="submit" className="neu-btn-primary" disabled={loading}>
                {loading ? 'Creating Account…' : 'Create Account'}
              </button>
            </div>
          </form>

          <p style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.875rem', color: '#475569' }}>
            Already have an account?{' '}
            <Link to="/signin" style={{ color: '#34d399', fontWeight: 700 }}>Sign In</Link>
          </p>
        </div>
      </div>

    </div>
  );
};

export default Signup;