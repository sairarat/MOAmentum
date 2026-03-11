import { useState } from 'react';
import { UserAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';

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
      {/* ── Left panel ── */}
      <div className="auth-panel-left" style={{ background: '#0a0f1e', borderRight: '1px solid #1e293b' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '2.25rem', height: '2.25rem', background: 'rgba(16,185,129,0.15)',
            borderRadius: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
            </svg>
          </div>
          <span style={{ color: '#f1f5f9', fontWeight: 800, fontSize: '1rem' }}>NEU MOA System</span>
        </div>

        <div>
          <h2 style={{ color: '#f1f5f9', fontSize: '2rem', fontWeight: 900, lineHeight: 1.25, margin: '0 0 1.5rem' }}>
            Join the MOA<br />Management Portal
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {[
              { icon: '🔑', title: 'Institutional Access', desc: 'Requires an official @neu.edu.ph email' },
              { icon: '📁', title: 'Document Tracking', desc: 'Track MOA status from draft to completion' },
              { icon: '📊', title: 'Audit Trail', desc: 'Every action is logged for compliance' },
            ].map(item => (
              <div key={item.title} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '1.25rem', marginTop: '0.1rem' }}>{item.icon}</span>
                <div>
                  <div style={{ color: '#e2e8f0', fontWeight: 600, fontSize: '0.875rem' }}>{item.title}</div>
                  <div style={{ color: '#475569', fontSize: '0.775rem', marginTop: '0.2rem' }}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ color: '#334155', fontSize: '0.75rem' }}>
          © {new Date().getFullYear()} New Era University · All rights reserved
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="auth-panel-right">
        <div className="auth-form-container" style={{ maxWidth: '420px' }}>
          <div style={{ marginBottom: '2rem' }}>
            <h1 style={{ fontSize: '1.875rem', fontWeight: 900, color: '#f1f5f9', margin: '0 0 0.5rem' }}>
              Create Account
            </h1>
            <p style={{ color: '#64748b', fontSize: '0.875rem', margin: 0 }}>
              Register with your NEU institutional email
            </p>
          </div>

          {error && <div className="neu-error">{error}</div>}

          <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
              <p style={{ marginTop: '0.375rem', fontSize: '0.72rem', color: '#475569' }}>
                Must be an @neu.edu.ph address
              </p>
            </div>

            <div>
              <label className="neu-label">Password</label>
              <input type="password" required placeholder="Minimum 6 characters" className="neu-input" onChange={set('password')} />
            </div>

            <div>
              <label className="neu-label">Confirm Password</label>
              <input type="password" required placeholder="Re-enter password" className="neu-input" onChange={set('confirmPassword')} />
            </div>

            <div style={{ paddingTop: '0.25rem' }}>
              <button type="submit" className="neu-btn-primary" disabled={loading}>
                {loading ? 'Creating Account…' : 'Create Account'}
              </button>
            </div>
          </form>

          <p style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.875rem', color: '#475569' }}>
            Already have an account? <Link to="/signin">Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;