import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { UserAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';

export type AppRole = 'student' | 'staff' | 'admin' | 'visitor';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: AppRole[];
}

const RoleGuard = ({ children, allowedRoles }: RoleGuardProps) => {
  const { user, loading: authLoading } = UserAuth();
  const [role, setRole] = useState<AppRole | null>(null);
  const [isBlocked, setIsBlocked] = useState(false);
  const [status, setStatus] = useState<'loading' | 'done'>('loading');
  const location = useLocation();

  useEffect(() => {
    const fetchRole = async () => {
      if (!user) { setStatus('done'); return; }
      const { data } = await supabase.from('profiles').select('role, is_blocked').eq('id', user.id).single();
      if (data) {
        setRole(data.role as AppRole);
        setIsBlocked(data.is_blocked);
      }
      setStatus('done');
    };
    if (!authLoading) fetchRole();
  }, [user, authLoading]);

  const centered: React.CSSProperties = {
    minHeight: '100vh', background: '#020817', display: 'flex',
    alignItems: 'center', justifyContent: 'center', color: '#e2e8f0'
  };

  if (authLoading || status === 'loading') {
    return (
      <div style={centered}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '2.5rem', height: '2.5rem', margin: '0 auto 1rem',
            border: '2px solid #1e293b', borderTopColor: '#10b981',
            borderRadius: '50%', animation: 'spin 0.7s linear infinite'
          }} />
          <p style={{ color: '#475569', fontSize: '0.875rem', margin: 0 }}>Verifying access…</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/signin" state={{ from: location }} replace />;

  if (isBlocked) {
    return (
      <div style={centered}>
        <div style={{ textAlign: 'center', maxWidth: '360px', padding: '2rem' }}>
          <div style={{
            width: '4rem', height: '4rem', background: 'rgba(239,68,68,0.1)',
            borderRadius: '50%', display: 'flex', alignItems: 'center',
            justifyContent: 'center', margin: '0 auto 1.25rem'
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
            </svg>
          </div>
          <h2 style={{ color: '#f1f5f9', fontWeight: 800, fontSize: '1.25rem', margin: '0 0 0.75rem' }}>
            Access Denied
          </h2>
          <p style={{ color: '#475569', fontSize: '0.875rem', margin: 0, lineHeight: 1.6 }}>
            Your account has been blocked. Please contact your system administrator for assistance.
          </p>
        </div>
      </div>
    );
  }

  if (role) {
    if (role === 'admin' && location.pathname === '/dashboard') return <Navigate to="/admin-dashboard" replace />;
    if (role !== 'admin' && location.pathname === '/admin-dashboard') return <Navigate to="/dashboard" replace />;
    if (!allowedRoles.includes(role)) return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default RoleGuard;