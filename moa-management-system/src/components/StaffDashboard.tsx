import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { UserAuth } from '../context/AuthContext';
import { logAudit } from './auditLogger';
import MoaForm from './MoaForm';

interface Moa {
  id: string; hteid: string; title: string; partner_name: string;
  address: string; contact_person: string; contact_email: string;
  contact_phone: string; effective_date: string; expiry_date: string | null;
  status: string; college_office: string; notes: string; created_at: string;
}

interface Profile {
  first_name: string; last_name: string; college_office: string; role: string;
}

const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, { bg: string; color: string; border: string }> = {
    approved: { bg: 'rgba(16,185,129,0.12)',  color: '#34d399', border: 'rgba(16,185,129,0.2)'  },
    pending:  { bg: 'rgba(245,158,11,0.12)',  color: '#fbbf24', border: 'rgba(245,158,11,0.2)'  },
    draft:    { bg: 'rgba(59,130,246,0.12)',  color: '#60a5fa', border: 'rgba(59,130,246,0.2)'  },
    expired:  { bg: 'rgba(100,116,139,0.12)', color: '#94a3b8', border: 'rgba(100,116,139,0.2)' },
    rejected: { bg: 'rgba(239,68,68,0.12)',   color: '#f87171', border: 'rgba(239,68,68,0.2)'   },
  };
  const s = map[status] ?? map['draft'];
  return (
    <span style={{ padding: '0.2rem 0.55rem', borderRadius: '0.4rem', background: s.bg, color: s.color, border: `1px solid ${s.border}`, fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
      {status}
    </span>
  );
};

const StaffDashboard = () => {
  const { user, signOutUser } = UserAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [moas, setMoas] = useState<Moa[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Moa | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [roleChange, setRoleChange] = useState<{ msg: string; to: string } | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchMoas = useCallback(async () => {
    const { data } = await supabase
      .from('moas').select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
    if (data) setMoas(data as Moa[]);
  }, []);

  useEffect(() => {
    if (!user) return;

    supabase.from('profiles').select('first_name, last_name, college_office, role').eq('id', user.id).single()
      .then(({ data }) => { if (data) setProfile(data as Profile); });

    setLoading(true);
    fetchMoas().finally(() => setLoading(false));

    // ── Real-time role change listener ────────────────────────────────────
    channelRef.current = supabase
      .channel(`staff-role-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` },
        (payload) => {
          const newRole = payload.new?.role;
          if (newRole === 'student') {
            setRoleChange({ msg: "Your role has been changed to Student. Redirecting…", to: '/dashboard' });
            setTimeout(() => navigate('/dashboard', { replace: true }), 2800);
          }
          if (newRole === 'admin') {
            setRoleChange({ msg: "You've been promoted to Admin! Redirecting…", to: '/admin-dashboard' });
            setTimeout(() => navigate('/admin-dashboard', { replace: true }), 2800);
          }
        }
      )
      .subscribe();

    return () => { channelRef.current?.unsubscribe(); };
  }, [user, navigate, fetchMoas]);

  const handleDelete = async (moa: Moa) => {
    if (!confirm(`Remove "${moa.partner_name}"? It can be recovered by an admin.`)) return;
    await supabase.from('moas').update({ deleted_at: new Date().toISOString() }).eq('id', moa.id);
    await logAudit(user!.id, 'DELETE', 'moas', { id: moa.id, partner: moa.partner_name });
    showToast(`"${moa.partner_name}" removed.`);
    fetchMoas();
  };

  const filtered = moas.filter(m => {
    const matchSearch =
      m.partner_name?.toLowerCase().includes(search.toLowerCase()) ||
      m.hteid?.toLowerCase().includes(search.toLowerCase()) ||
      m.title?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || m.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const stats = [
    { label: 'Total',    value: moas.length,                                      accent: '#334155' },
    { label: 'Approved', value: moas.filter(m => m.status === 'approved').length, accent: 'rgba(16,185,129,0.3)' },
    { label: 'Pending',  value: moas.filter(m => m.status === 'pending').length,  accent: 'rgba(245,158,11,0.3)' },
    { label: 'Draft',    value: moas.filter(m => m.status === 'draft').length,    accent: 'rgba(59,130,246,0.25)' },
  ];

  const th: React.CSSProperties = { padding: '0.7rem 1.25rem', textAlign: 'left', fontSize: '0.68rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em' };
  const td: React.CSSProperties = { padding: '0.875rem 1.25rem', borderBottom: '1px solid rgba(30,41,59,0.6)', fontSize: '0.84rem' };

  return (
    <div style={{ minHeight: '100vh', background: '#020817', color: '#e2e8f0', display: 'flex' }}>

      {/* Role change banner */}
      {roleChange && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
          background: 'linear-gradient(90deg, #1e3a5f, #1e40af)',
          color: 'white', padding: '1rem 2rem',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem',
          boxShadow: '0 4px 24px rgba(30,64,175,0.4)',
        }}>
          <span style={{ fontSize: '1.1rem' }}>🔄</span>
          <span style={{ fontWeight: 600, fontSize: '0.92rem' }}>{roleChange.msg}</span>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: '1.5rem', right: '1.5rem', zIndex: 100, padding: '0.75rem 1.25rem', borderRadius: '0.75rem', background: toast.type === 'success' ? '#059669' : '#dc2626', color: 'white', fontWeight: 600, fontSize: '0.875rem', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
          {toast.msg}
        </div>
      )}

      {/* MOA Form */}
      {showForm && (
        <MoaForm
          initial={editTarget ? { ...editTarget, id: editTarget.id } : undefined}
          onSuccess={() => {
            setShowForm(false); setEditTarget(null);
            fetchMoas();
            showToast(editTarget ? 'MOA updated.' : 'MOA created.');
          }}
          onCancel={() => { setShowForm(false); setEditTarget(null); }}
        />
      )}

      {/* Sidebar */}
      <div style={{ position: 'fixed', left: 0, top: 0, height: '100%', width: '4rem', background: '#0a0f1e', borderRight: '1px solid #1e293b', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '1.5rem 0', gap: '0.5rem', zIndex: 20 }}>
        <div style={{ width: '2.25rem', height: '2.25rem', background: '#7c3aed', borderRadius: '0.625rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
          </svg>
        </div>

        <div style={{ marginTop: '0.75rem', width: '2.25rem', height: '2.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '0.625rem', background: 'rgba(124,58,237,0.15)', color: '#a78bfa' }}>
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
            <div style={{ fontWeight: 700, fontSize: '1rem', color: '#f1f5f9' }}>
              Welcome, {profile?.first_name || 'Staff'} 👋
            </div>
            <div style={{ fontSize: '0.72rem', color: '#475569', marginTop: '0.1rem' }}>{user?.email}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {profile?.college_office && (
              <span style={{ color: '#64748b', fontSize: '0.78rem' }}>{profile.college_office}</span>
            )}
            <span style={{ padding: '0.25rem 0.7rem', background: 'rgba(124,58,237,0.12)', color: '#a78bfa', border: '1px solid rgba(124,58,237,0.2)', borderRadius: '0.5rem', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Staff / Maintainer
            </span>
          </div>
        </header>

        <main style={{ padding: '2rem', flex: 1 }}>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '1rem', marginBottom: '2rem' }}>
            {stats.map(s => (
              <div key={s.label} style={{ background: '#0f172a', border: `1px solid ${s.accent}`, borderRadius: '0.875rem', padding: '1.1rem 1.4rem' }}>
                <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#f1f5f9', lineHeight: 1 }}>{loading ? '—' : s.value}</div>
                <div style={{ fontSize: '0.68rem', color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: '0.35rem' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* MOA Table */}
          <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '1rem', overflow: 'hidden' }}>
            {/* Table header controls */}
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #1e293b', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', flexShrink: 0 }}>
                MOA Records
              </span>
              <input
                placeholder="Search partner, HTEID, title…"
                value={search} onChange={e => setSearch(e.target.value)}
                style={{ padding: '0.42rem 0.875rem', background: '#0a0f1e', border: '1px solid #1e293b', borderRadius: '0.5rem', color: '#e2e8f0', fontSize: '0.8rem', outline: 'none', fontFamily: 'inherit', flex: 1, minWidth: '140px', maxWidth: '240px' }}
                onFocus={e => { e.target.style.borderColor = '#7c3aed'; }}
                onBlur={e => { e.target.style.borderColor = '#1e293b'; }}
              />
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                style={{ padding: '0.42rem 0.75rem', background: '#0a0f1e', border: '1px solid #1e293b', borderRadius: '0.5rem', color: '#e2e8f0', fontSize: '0.8rem', outline: 'none', fontFamily: 'inherit', cursor: 'pointer' }}>
                <option value="all">All Statuses</option>
                <option value="approved">Approved</option>
                <option value="pending">Pending</option>
                <option value="draft">Draft</option>
                <option value="expired">Expired</option>
                <option value="rejected">Rejected</option>
              </select>
              <button
                onClick={() => { setEditTarget(null); setShowForm(true); }}
                style={{ marginLeft: 'auto', padding: '0.5rem 1.1rem', background: '#7c3aed', border: 'none', borderRadius: '0.5rem', color: 'white', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                + New MOA
              </button>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #1e293b' }}>
                    {['HTEID', 'Partner / Company', 'Address', 'Contact', 'Effective', 'Status', 'Actions'].map(h => (
                      <th key={h} style={{ ...th, textAlign: h === 'Actions' ? 'right' : 'left' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={7} style={{ ...td, textAlign: 'center', color: '#475569', padding: '3rem' }}>Loading…</td></tr>
                  ) : filtered.length === 0 ? (
                    <tr><td colSpan={7} style={{ ...td, textAlign: 'center', color: '#475569', padding: '3rem' }}>
                      {search || statusFilter !== 'all' ? 'No matching records.' : 'No MOAs yet — click "+ New MOA" to add one.'}
                    </td></tr>
                  ) : filtered.map(moa => (
                    <tr key={moa.id} style={{ borderBottom: '1px solid rgba(30,41,59,0.5)' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(255,255,255,0.015)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'; }}
                    >
                      <td style={{ ...td, fontFamily: 'monospace', fontSize: '0.78rem', color: '#64748b' }}>{moa.hteid || '—'}</td>
                      <td style={td}>
                        <div style={{ color: '#f1f5f9', fontWeight: 600 }}>{moa.partner_name}</div>
                        {moa.title && <div style={{ color: '#475569', fontSize: '0.72rem', marginTop: '0.12rem' }}>{moa.title}</div>}
                      </td>
                      <td style={{ ...td, color: '#64748b', fontSize: '0.8rem', maxWidth: '160px' }}>
                        <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{moa.address || '—'}</span>
                      </td>
                      <td style={{ ...td, fontSize: '0.78rem' }}>
                        {moa.contact_person && <div style={{ color: '#94a3b8' }}>{moa.contact_person}</div>}
                        {moa.contact_email && <div style={{ color: '#475569', fontSize: '0.72rem' }}>{moa.contact_email}</div>}
                        {moa.contact_phone && <div style={{ color: '#475569', fontSize: '0.72rem' }}>{moa.contact_phone}</div>}
                        {!moa.contact_person && !moa.contact_email && !moa.contact_phone && <span style={{ color: '#334155' }}>—</span>}
                      </td>
                      <td style={{ ...td, color: '#64748b', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>{fmtDate(moa.effective_date)}</td>
                      <td style={td}><StatusBadge status={moa.status} /></td>
                      <td style={{ ...td, textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button onClick={() => { setEditTarget(moa); setShowForm(true); }}
                          style={{ padding: '0.28rem 0.65rem', fontSize: '0.75rem', fontWeight: 600, border: '1px solid #1e293b', background: '#0f172a', color: '#94a3b8', borderRadius: '0.45rem', cursor: 'pointer', fontFamily: 'inherit', marginLeft: '0.3rem' }}>
                          Edit
                        </button>
                        <button onClick={() => handleDelete(moa)}
                          style={{ padding: '0.28rem 0.65rem', fontSize: '0.75rem', fontWeight: 600, border: '1px solid rgba(239,68,68,0.25)', background: 'rgba(239,68,68,0.08)', color: '#f87171', borderRadius: '0.45rem', cursor: 'pointer', fontFamily: 'inherit', marginLeft: '0.3rem' }}>
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default StaffDashboard;