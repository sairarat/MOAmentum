import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { UserAuth } from '../context/AuthContext';
import type { AppRole } from './RoleGuard';
import StudentDashboard from './StudentDashboard';
import StaffDashboard from './StaffDashboard';

/**
 * UserDashboard is a thin role-router.
 *
 * It reads the user's current role from Supabase once on mount and renders
 * the appropriate dashboard component:
 *   - student  →  StudentDashboard  (read-only, approved MOAs only)
 *   - staff    →  StaffDashboard    (full CRUD, all non-deleted MOAs)
 *
 * Each child dashboard ALSO subscribes to real-time role changes on the
 * profiles table, so if an admin promotes/demotes the user mid-session,
 * the user sees a banner and is redirected automatically.
 */
const UserDashboard = () => {
  const { user } = UserAuth();
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (data) setRole(data.role as AppRole);
        setLoading(false);
      });
  }, [user]);

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', background: '#020817',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '2.25rem', height: '2.25rem',
            border: '2px solid #1e293b', borderTopColor: '#10b981',
            borderRadius: '50%', animation: 'spin 0.7s linear infinite',
            margin: '0 auto 0.875rem',
          }} />
          <p style={{ color: '#475569', fontSize: '0.875rem', margin: 0 }}>
            Loading dashboard…
          </p>
        </div>
      </div>
    );
  }

  // staff role → full maintainer dashboard
  if (role === 'staff') return <StaffDashboard />;

  // student (and any other non-admin roles) → read-only directory
  return <StudentDashboard />;
};

export default UserDashboard;