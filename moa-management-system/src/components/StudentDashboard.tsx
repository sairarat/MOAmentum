import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { UserAuth } from '../context/AuthContext';

interface Moa {
  id: string;
  partner_name: string;
  address: string;
  contact_person: string;
  contact_email: string;
  contact_phone: string;
  college_office: string;
  effective_date: string;
}

interface Profile {
  first_name: string;
  last_name: string;
  college_office: string;
  student_number: string;
}

const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

/**
 * Student / User dashboard.
 * - Read-only
 * - Only approved, non-deleted MOAs
 * - Limited columns: Company, Address, Contact Details, College/Office, Effective Date
 * - Listens for role promotion → redirects to StaffDashboard or AdminDashboard live
 */
const StudentDashboard = () => {
  const { user, signOutUser } = UserAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [moas, setMoas] = useState<Moa[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [promotionMsg, setPromotionMsg] = useState('');
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!user) return;

    // Fetch profile
    supabase.from('profiles')
      .select('first_name, last_name, college_office, student_number')
      .eq('id', user.id).single()
      .then(({ data }) => { if (data) setProfile(data as Profile); });

    // Student view rules (strictly enforced):
    // ✅ Only APPROVED status rows
    // ✅ Only non-deleted rows (deleted_at IS NULL)
    // ✅ Limited columns ONLY: partner_name, address, contact_person, contact_email, contact_phone, college_office, effective_date
    // ❌ No status column (students only see approved — no need to show it)
    // ❌ No hteid, notes, expiry_date, created_at, deleted_at, or any audit data
    supabase.from('moas')
      .select('id, partner_name, address, contact_person, contact_email, contact_phone, college_office, effective_date')
      .eq('status', 'approved')
      .is('deleted_at', null)
      .order('partner_name', { ascending: true })
      .then(({ data }) => { if (data) setMoas(data as Moa[]); setLoading(false); });

    // Real-time: if admin promotes this user, show banner then redirect
    channelRef.current = supabase
      .channel(`student-role-watch-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` },
        (payload) => {
          const newRole = payload.new?.role;
          if (newRole === 'staff') {
            setPromotionMsg("🎉 You've been promoted to Staff / Maintainer! Redirecting to your new dashboard…");
            setTimeout(() => {
              // Force a full dashboard re-render so UserDashboard re-reads role
              navigate('/dashboard', { replace: true });
              window.location.reload();
            }, 2800);
          }
          if (newRole === 'admin') {
            setPromotionMsg("🎉 You've been promoted to Admin! Redirecting…");
            setTimeout(() => navigate('/admin-dashboard', { replace: true }), 2800);
          }
        }
      )
      .subscribe();

    return () => { channelRef.current?.unsubscribe(); };
  }, [user, navigate]);

  const filtered = moas.filter(m =>
    m.partner_name?.toLowerCase().includes(search.toLowerCase()) ||
    m.address?.toLowerCase().includes(search.toLowerCase()) ||
    m.college_office?.toLowerCase().includes(search.toLowerCase()) ||
    m.contact_person?.toLowerCase().includes(search.toLowerCase())
  );

  const th: React.CSSProperties = { padding: '0.7rem 1.25rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em' };
  const td: React.CSSProperties = { padding: '1rem 1.25rem', borderBottom: '1px solid rgba(30,41,59,0.5)', fontSize: '0.875rem', color: '#cbd5e1' };

  return (
    <div style={{ minHeight: '100vh', background: '#020817', color: '#e2e8f0', display: 'flex' }}>

      {/* Promotion banner */}
      {promotionMsg && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
          background: 'linear-gradient(90deg, #4c1d95, #7c3aed)',
          color: 'white', padding: '1rem 2rem',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem',
          boxShadow: '0 4px 24px rgba(124,58,237,0.45)',
        }}>
          <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{promotionMsg}</span>
        </div>
      )}

      {/* Sidebar */}
      <div style={{ position: 'fixed', left: 0, top: 0, height: '100%', width: '4rem', background: '#0a0f1e', borderRight: '1px solid #1e293b', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '1.5rem 0', zIndex: 20 }}>
        <div style={{ width: '2.25rem', height: '2.25rem', background: '#059669', borderRadius: '0.625rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
          </svg>
        </div>

        <div style={{ marginTop: '1.25rem', width: '2.25rem', height: '2.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '0.625rem', background: 'rgba(16,185,129,0.12)', color: '#34d399' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
          </svg>
        </div>

        <div style={{ flex: 1 }} />

        <button onClick={signOutUser} title="Sign Out"
          style={{ width: '2.25rem', height: '2.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '0.625rem', border: 'none', cursor: 'pointer', background: 'transparent', color: '#475569', fontFamily: 'inherit' }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#f87171'; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.1)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#475569'; (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
        </button>
      </div>

      {/* Main */}
      <div style={{ marginLeft: '4rem', flex: 1, display: 'flex', flexDirection: 'column' }}>

        {/* Topbar */}
        <header style={{ position: 'sticky', top: 0, zIndex: 10, background: 'rgba(2,8,23,0.88)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #1e293b', padding: '1rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: '#f1f5f9' }}>MOA Directory</div>
            <div style={{ fontSize: '0.72rem', color: '#475569', marginTop: '0.1rem' }}>{user?.email}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {profile?.student_number && (
              <span style={{ color: '#475569', fontSize: '0.75rem', fontFamily: 'monospace' }}>#{profile.student_number}</span>
            )}
            <span style={{ padding: '0.25rem 0.7rem', background: 'rgba(16,185,129,0.1)', color: '#34d399', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '0.5rem', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Student
            </span>
          </div>
        </header>

        <main style={{ padding: '2rem', flex: 1 }}>

          {/* Welcome banner */}
          <div style={{ background: 'linear-gradient(135deg, #022c22 0%, #064e3b 100%)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '1rem', padding: '1.5rem 2rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h2 style={{ color: '#f1f5f9', fontWeight: 800, fontSize: '1.15rem', margin: '0 0 0.4rem' }}>
                Welcome, {profile?.first_name || 'Student'} {profile?.last_name || ''} 👋
              </h2>
              <p style={{ color: 'rgba(167,243,208,0.7)', fontSize: '0.85rem', margin: 0, lineHeight: 1.6 }}>
                Browse all active Memoranda of Agreement between NEU and its partners.
              </p>
              {profile?.college_office && (
                <p style={{ color: 'rgba(167,243,208,0.5)', fontSize: '0.78rem', margin: '0.4rem 0 0' }}>📍 {profile.college_office}</p>
              )}
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '2.25rem', fontWeight: 900, color: '#34d399', lineHeight: 1 }}>{loading ? '—' : moas.length}</div>
              <div style={{ fontSize: '0.68rem', color: 'rgba(167,243,208,0.5)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '0.25rem' }}>Active Partners</div>
            </div>
          </div>

          {/* Student View Notice */}
          <div style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: '0.75rem', padding: '0.65rem 1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'flex-start', gap: '0.6rem' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginTop: '0.1rem', flexShrink: 0 }}>
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <div style={{ color: '#60a5fa', fontSize: '0.78rem', lineHeight: 1.6 }}>
              <strong>Student View</strong> — Showing only <strong>approved</strong> MOAs.
              Pending, draft, expired, and deleted entries are not visible at this access level.
              Displayed fields are limited to Company, Address, and Contact Details.
            </div>
          </div>

          {/* Search */}
          <div style={{ marginBottom: '1.25rem' }}>
            <input
              placeholder="Search by company, address, college, or contact…"
              value={search} onChange={e => setSearch(e.target.value)}
              style={{ padding: '0.6rem 1rem', background: '#0f172a', border: '1px solid #1e293b', borderRadius: '0.625rem', color: '#e2e8f0', fontSize: '0.85rem', outline: 'none', fontFamily: 'inherit', width: '100%', maxWidth: '420px', boxSizing: 'border-box' }}
              onFocus={e => { e.target.style.borderColor = '#10b981'; }}
              onBlur={e => { e.target.style.borderColor = '#1e293b'; }}
            />
          </div>

          {/* Table */}
          <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '1rem', overflow: 'hidden' }}>
            <div style={{ padding: '0.875rem 1.5rem', borderBottom: '1px solid #1e293b', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Approved MOA Partners
              </span>
              <span style={{ color: '#475569', fontSize: '0.75rem' }}>
                {loading ? '…' : `${filtered.length} partner${filtered.length !== 1 ? 's' : ''}`}
              </span>
            </div>

            {loading ? (
              <div style={{ padding: '4rem', textAlign: 'center' }}>
                <div style={{ width: '2rem', height: '2rem', border: '2px solid #1e293b', borderTopColor: '#10b981', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 0.875rem' }} />
                <p style={{ color: '#475569', fontSize: '0.875rem', margin: 0 }}>Loading directory…</p>
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: '4rem', textAlign: 'center', color: '#475569' }}>
                <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🔍</div>
                <p style={{ margin: 0, fontSize: '0.9rem' }}>
                  {search ? 'No partners match your search.' : 'No approved MOAs available yet.'}
                </p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #1e293b' }}>
                      {/* Strictly limited columns for students */}
                      <th style={th}>Company / Partner</th>
                      <th style={th}>Address</th>
                      <th style={th}>Contact Details</th>
                      <th style={th}>College / Office</th>
                      <th style={th}>Effective Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(moa => (
                      <tr key={moa.id} style={{ borderBottom: '1px solid rgba(30,41,59,0.5)' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(255,255,255,0.015)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'; }}
                      >
                        <td style={{ ...td, color: '#f1f5f9', fontWeight: 600 }}>{moa.partner_name}</td>
                        <td style={{ ...td, color: '#cbd5e1', fontSize: '0.875rem', maxWidth: '200px' }}>
                          <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{moa.address || '—'}</span>
                        </td>
                        <td style={{ ...td, fontSize: '0.8rem' }}>
                          <div style={{ color: '#e2e8f0', fontWeight: 500 }}>{moa.contact_person || '—'}</div>
                          {moa.contact_email && (
                            <a href={`mailto:${moa.contact_email}`} style={{ color: '#34d399', fontSize: '0.8rem', display: 'block', marginTop: '0.15rem' }}>
                              {moa.contact_email}
                            </a>
                          )}
                          {moa.contact_phone && (
                            <div style={{ color: '#94a3b8', fontSize: '0.8rem' }}>{moa.contact_phone}</div>
                          )}
                        </td>
                        <td style={{ ...td, color: '#cbd5e1', fontSize: '0.875rem' }}>{moa.college_office || '—'}</td>
                        <td style={{ ...td, color: '#94a3b8', fontSize: '0.875rem', whiteSpace: 'nowrap' }}>{fmtDate(moa.effective_date)}</td>
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

export default StudentDashboard;