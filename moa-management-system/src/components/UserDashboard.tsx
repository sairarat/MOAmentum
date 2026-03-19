import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { UserAuth } from '../context/AuthContext';
import type { AppRole } from './RoleGuard';
import StudentDashboard from './StudentDashboard';
import StaffDashboard from './StaffDashboard';

const UserDashboard = () => {
  const { user } = UserAuth();
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase.from('profiles').select('role').eq('id', user.id).single()
      .then(({ data }) => {
        if (data) setRole(data.role as AppRole);
        setLoading(false);
      });
  }, [user]);

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'var(--bg-base, #030712)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'var(--font-sans, DM Sans, system-ui, sans-serif)',
      }}>
        <div style={{ textAlign: 'center', animation: 'fadeIn 0.3s ease' }}>
          {/* NEU green spinner */}
          <div style={{
            width: '3rem', height: '3rem',
            border: '3px solid rgba(16,185,129,0.15)',
            borderTopColor: '#10b981',
            borderRadius: '50%',
            animation: 'spin 0.75s linear infinite',
            margin: '0 auto 1.25rem',
          }} />
          <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: '0 0 0.25rem', fontWeight: 500 }}>
            Loading your dashboard
          </p>
          <p style={{ color: '#374151', fontSize: '0.75rem', margin: 0 }}>
            Verifying your access level…
          </p>
        </div>
      </div>
    );
  }

  if (role === 'staff') return <StaffDashboard />;
  return <StudentDashboard />;
};

export default UserDashboard;