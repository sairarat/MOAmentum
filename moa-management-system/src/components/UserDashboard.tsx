import { useEffect, useState } from 'react';
import { UserAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';
import type { AppRole } from './RoleGuard';

interface Profile {
  first_name: string;
  last_name: string;
  role: AppRole;
  college_office: string;
}

interface Moa {
  id: string;
  title: string;
  partner_name: string;
  status: string;
  created_at: string;
}

const STATUS_BADGE: Record<string, string> = {
  active:  'badge badge-green',
  pending: 'badge badge-amber',
  draft:   'badge badge-blue',
  expired: 'badge badge-slate',
};

const ROLE_LABEL: Record<string, string> = {
  student: 'Student',
  staff:   'Staff / Maintainer',
  admin:   'Administrator',
  visitor: 'Visitor',
};

const ROLE_BADGE_CLASS: Record<string, string> = {
  student: 'badge badge-blue',
  staff:   'badge badge-violet',
  admin:   'badge badge-amber',
  visitor: 'badge badge-slate',
};

const UserDashboard = () => {
  const { user, signOutUser } = UserAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [moas, setMoas] = useState<Moa[]>([]);
  const [moaLoading, setMoaLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase.from('profiles')
      .select('first_name, last_name, role, college_office')
      .eq('id', user.id).single()
      .then(({ data }) => { if (data) setProfile(data as Profile); });

    supabase.from('moas')
      .select('id, title, partner_name, status, created_at')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(10)
      .then(({ data }) => { if (data) setMoas(data); setMoaLoading(false); });
  }, [user]);

  const stats = [
    { label: 'Total MOAs',     value: moas.length,                                    icon: '📋' },
    { label: 'Active',         value: moas.filter(m => m.status === 'active').length,  icon: '✅' },
    { label: 'Pending Review', value: moas.filter(m => m.status === 'pending').length, icon: '⏳' },
    { label: 'Drafts',         value: moas.filter(m => m.status === 'draft').length,   icon: '📝' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#020817', color: '#e2e8f0', display: 'flex' }}>
      {/* ── Sidebar ── */}
      <div className="neu-sidebar">
        <div style={{
          width: '2.25rem', height: '2.25rem', background: '#059669',
          borderRadius: '0.625rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
          </svg>
        </div>

        <div style={{ flex: 1 }} />

        {/* Active nav item */}
        <button className="sidebar-icon-btn active" title="Dashboard">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
            <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
          </svg>
        </button>

        <div style={{ flex: 1 }} />

        <button className="sidebar-icon-btn danger" title="Sign Out" onClick={signOutUser}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
        </button>
      </div>

      {/* ── Main ── */}
      <div style={{ marginLeft: '4rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Top bar */}
        <header className="neu-topbar">
          <div>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: '#f1f5f9' }}>
              Good day, {profile?.first_name || 'User'} 👋
            </div>
            <div style={{ fontSize: '0.75rem', color: '#475569', marginTop: '0.125rem' }}>{user?.email}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {profile?.college_office && (
              <span style={{ fontSize: '0.775rem', color: '#64748b' }}>{profile.college_office}</span>
            )}
            <span className={ROLE_BADGE_CLASS[profile?.role || 'student']}>
              {ROLE_LABEL[profile?.role || 'student']}
            </span>
          </div>
        </header>

        <main style={{ padding: '2rem', flex: 1 }}>
          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
            {stats.map(s => (
              <div className="neu-stat-card" key={s.label}>
                <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{s.icon}</div>
                <div style={{ fontSize: '2rem', fontWeight: 900, color: '#f1f5f9', lineHeight: 1 }}>
                  {moaLoading ? '—' : s.value}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: '0.4rem' }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>

          {/* MOA table */}
          <div className="neu-card">
            <div style={{
              padding: '1rem 1.5rem',
              borderBottom: '1px solid #1e293b',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Recent MOAs
              </span>
              <span style={{ fontSize: '0.75rem', color: '#475569' }}>{moas.length} records</span>
            </div>

            {moaLoading ? (
              <div style={{ padding: '3rem', textAlign: 'center' }}>
                <div className="spinner" style={{ margin: '0 auto' }} />
              </div>
            ) : moas.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#475569' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📭</div>
                <p style={{ margin: 0, fontSize: '0.875rem' }}>No MOAs found in the system.</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="neu-table">
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Partner</th>
                      <th>Status</th>
                      <th>Date Added</th>
                    </tr>
                  </thead>
                  <tbody>
                    {moas.map(moa => (
                      <tr key={moa.id}>
                        <td style={{ color: '#f1f5f9', fontWeight: 500 }}>{moa.title}</td>
                        <td style={{ color: '#94a3b8' }}>{moa.partner_name}</td>
                        <td>
                          <span className={STATUS_BADGE[moa.status] || 'badge badge-slate'}>
                            {moa.status}
                          </span>
                        </td>
                        <td style={{ color: '#475569', fontSize: '0.775rem' }}>
                          {new Date(moa.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default UserDashboard;