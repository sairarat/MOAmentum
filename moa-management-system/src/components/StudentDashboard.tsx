import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { UserAuth } from '../context/AuthContext';

interface Moa {
  id: string; partner_name: string; address: string;
  contact_person: string; contact_email: string; contact_phone: string;
  college_office: string; effective_date: string;
}
interface Profile { first_name: string; last_name: string; college_office: string; student_number: string; }

const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

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
    supabase.from('profiles').select('first_name, last_name, college_office, student_number').eq('id', user.id).single()
      .then(({ data }) => { if (data) setProfile(data as Profile); });

    supabase.from('moas')
      .select('id, partner_name, address, contact_person, contact_email, contact_phone, college_office, effective_date')
      .eq('status', 'approved').is('deleted_at', null).order('partner_name', { ascending: true })
      .then(({ data }) => { if (data) setMoas(data as Moa[]); setLoading(false); });

    channelRef.current = supabase.channel(`student-role-${user.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` }, (payload) => {
        const nr = payload.new?.role;
        if (nr === 'staff') { setPromotionMsg("🎉 Promoted to Staff / Maintainer! Redirecting…"); setTimeout(() => { navigate('/dashboard', { replace: true }); window.location.reload(); }, 2800); }
        if (nr === 'admin') { setPromotionMsg("🎉 Promoted to Admin! Redirecting…"); setTimeout(() => navigate('/admin-dashboard', { replace: true }), 2800); }
      }).subscribe();

    return () => { channelRef.current?.unsubscribe(); };
  }, [user, navigate]);

  const filtered = moas.filter(m =>
    m.partner_name?.toLowerCase().includes(search.toLowerCase()) ||
    m.address?.toLowerCase().includes(search.toLowerCase()) ||
    m.college_office?.toLowerCase().includes(search.toLowerCase()) ||
    m.contact_person?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', color: 'var(--text-primary)', display: 'flex', fontFamily: 'var(--font-sans)' }}>

      {/* Promotion banner */}
      {promotionMsg && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200, background: 'linear-gradient(90deg, #4c1d95, #7c3aed)', color: 'white', padding: '0.875rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', boxShadow: '0 4px 20px rgba(124,58,237,0.45)', fontSize: '0.9rem', fontWeight: 600 }}>
          {promotionMsg}
        </div>
      )}

      {/* Sidebar */}
      <div className="neu-sidebar">
        <div style={{ width: '2.25rem', height: '2.25rem', background: 'linear-gradient(135deg, #059669, #047857)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.5rem', flexShrink: 0, boxShadow: '0 4px 12px rgba(5,150,105,0.35)' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
          </svg>
        </div>
        <div style={{ width: '100%', height: '1px', background: 'var(--border)', margin: '0.5rem 0' }} />
        <button className="sidebar-btn active-green" title="MOA Directory" style={{ fontSize: '1.05rem' }}>📋</button>
        <div style={{ flex: 1 }} />
        <button className="sidebar-btn danger" title="Sign Out" onClick={signOutUser}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
        </button>
      </div>

      {/* Main */}
      <div style={{ marginLeft: '64px', flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

        {/* Topbar */}
        <header className="neu-topbar">
          <div>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>MOA Directory</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>{user?.email}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {profile?.student_number && (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>#{profile.student_number}</span>
            )}
            <span className="badge badge-role-student">Student</span>
          </div>
        </header>

        <main style={{ padding: '1.75rem 2rem', flex: 1 }}>

          {/* Welcome card */}
          <div style={{ background: 'linear-gradient(135deg, #022c22 0%, #064e3b 100%)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '14px', padding: '1.75rem 2rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1.25rem', boxShadow: '0 4px 20px rgba(5,150,105,0.12)' }}>
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'rgba(167,243,208,0.55)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>MOA Directory</div>
              <h2 style={{ color: '#f9fafb', fontWeight: 800, fontSize: '1.25rem', margin: '0 0 0.5rem', letterSpacing: '-0.02em' }}>
                Welcome, {profile?.first_name || 'Student'} {profile?.last_name || ''} 👋
              </h2>
              <p style={{ color: 'rgba(167,243,208,0.65)', fontSize: '0.85rem', margin: 0, lineHeight: 1.6 }}>
                Browse approved Memoranda of Agreement between NEU and its institutional partners.
              </p>
              {profile?.college_office && (
                <p style={{ color: 'rgba(167,243,208,0.45)', fontSize: '0.78rem', margin: '0.5rem 0 0', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span>📍</span> {profile.college_office}
                </p>
              )}
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: '2.5rem', fontWeight: 900, color: '#34d399', lineHeight: 1, letterSpacing: '-0.04em' }}>
                {loading ? '—' : moas.length}
              </div>
              <div style={{ fontSize: '0.68rem', color: 'rgba(167,243,208,0.45)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '0.25rem' }}>Active Partners</div>
            </div>
          </div>

          {/* Read-only notice */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem', padding: '0.75rem 1rem', background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: '10px', marginBottom: '1.5rem', fontSize: '0.82rem', color: '#93c5fd', lineHeight: 1.6 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '0.1rem' }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <span><strong>Read-only view.</strong> Only approved MOAs are shown. Fields are limited to Company, Address, and Contact Details. Contact staff for more information.</span>
          </div>

          {/* Search bar */}
          <div style={{ position: 'relative', marginBottom: '1.25rem', maxWidth: '440px' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              placeholder="Search by company, address, college, contact…"
              value={search} onChange={e => setSearch(e.target.value)}
              className="filter-input"
              style={{ width: '100%', boxSizing: 'border-box', fontSize: '0.875rem', padding: '0.6rem 1rem 0.6rem 2.25rem' }}
            />
          </div>

          {/* MOA Table */}
          <div className="neu-card">
            <div className="neu-card-header">
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Approved MOA Partners
              </span>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {loading ? '…' : `${filtered.length} partner${filtered.length !== 1 ? 's' : ''}`}
              </span>
            </div>

            {loading ? (
              <div style={{ padding: '4rem', textAlign: 'center' }}>
                <div className="spinner" style={{ margin: '0 auto 1rem' }} />
                <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.875rem' }}>Loading directory…</p>
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '3rem', marginBottom: '0.875rem' }}>🔍</div>
                <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 500 }}>
                  {search ? 'No partners match your search.' : 'No approved MOAs available yet.'}
                </p>
                {search && <p style={{ margin: '0.375rem 0 0', fontSize: '0.8rem', color: 'var(--text-dim)' }}>Try different keywords.</p>}
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="neu-table">
                  <thead>
                    <tr>
                      <th>Company / Partner</th>
                      <th>Address</th>
                      <th>Contact Details</th>
                      <th>College / Office</th>
                      <th>Effective Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(moa => (
                      <tr key={moa.id}>
                        <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{moa.partner_name}</td>
                        <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', maxWidth: '200px' }}>
                          <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{moa.address || '—'}</span>
                        </td>
                        <td>
                          <div style={{ color: 'var(--text-primary)', fontWeight: 500, fontSize: '0.85rem' }}>{moa.contact_person || '—'}</div>
                          {moa.contact_email && (
                            <a href={`mailto:${moa.contact_email}`} style={{ color: 'var(--accent)', fontSize: '0.78rem', display: 'block', marginTop: '0.15rem', fontWeight: 500 }}>
                              {moa.contact_email}
                            </a>
                          )}
                          {moa.contact_phone && (
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>{moa.contact_phone}</div>
                          )}
                        </td>
                        <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{moa.college_office || '—'}</td>
                        <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>{fmtDate(moa.effective_date)}</td>
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