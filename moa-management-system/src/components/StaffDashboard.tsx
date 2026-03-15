import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { UserAuth } from '../context/AuthContext';
import { logAudit } from './auditLogger';
import MoaForm from './MoaForm';

// ─── Types ───────────────────────────────────────────────────────────────────

// Faculty view: all non-deleted MOAs, all statuses — NO deleted_at, NO audit trail
interface Moa {
  id: string;
  hteid: string;
  title: string;
  partner_name: string;
  address: string;
  contact_person: string;
  contact_email: string;
  contact_phone: string;
  effective_date: string;
  expiry_date: string | null;
  status: string;
  college_office: string;
  notes: string;
  created_at: string;
}

interface Profile {
  first_name: string;
  last_name: string;
  college_office: string;
  role: string;
}

// ─── Status config — all 6 statuses, clearly differentiated (Day 5) ──────────

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; border: string; dot: string }> = {
  approved: { label: 'Approved',  color: '#34d399', bg: 'rgba(16,185,129,0.12)',  border: 'rgba(16,185,129,0.25)',  dot: '#10b981' },
  pending:  { label: 'Pending',   color: '#fbbf24', bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.25)',  dot: '#f59e0b' },
  draft:    { label: 'Draft',     color: '#60a5fa', bg: 'rgba(59,130,246,0.12)',  border: 'rgba(59,130,246,0.25)',  dot: '#3b82f6' },
  expired:  { label: 'Expired',   color: '#94a3b8', bg: 'rgba(100,116,139,0.12)', border: 'rgba(100,116,139,0.25)', dot: '#64748b' },
  rejected: { label: 'Rejected',  color: '#f87171', bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.25)',   dot: '#ef4444' },
  inactive: { label: 'Inactive',  color: '#c084fc', bg: 'rgba(192,132,252,0.12)', border: 'rgba(192,132,252,0.25)', dot: '#a855f7' },
};

const StatusBadge = ({ status }: { status: string }) => {
  const cfg = STATUS_CFG[status] ?? STATUS_CFG['draft'];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
      padding: '0.22rem 0.6rem', borderRadius: '0.4rem',
      background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
      fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
      whiteSpace: 'nowrap',
    }}>
      <span style={{ width: '0.4rem', height: '0.4rem', borderRadius: '50%', background: cfg.dot, flexShrink: 0 }} />
      {cfg.label}
    </span>
  );
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

// ─── Component ───────────────────────────────────────────────────────────────

const StaffDashboard = () => {
  const { user, signOutUser } = UserAuth();
  const navigate = useNavigate();

  const [profile,      setProfile]      = useState<Profile | null>(null);
  const [moas,         setMoas]         = useState<Moa[]>([]);
  const [loading,      setLoading]      = useState(true);

  // Search & filters (Day 2 + Day 3)
  const [search,        setSearch]       = useState('');
  const [collegeFilter, setCollegeFilter]= useState('all');
  const [statusFilter,  setStatusFilter] = useState('all');
  const [dateFrom,      setDateFrom]     = useState('');
  const [dateTo,        setDateTo]       = useState('');

  // UI state
  const [showForm,    setShowForm]    = useState(false);
  const [editTarget,  setEditTarget]  = useState<Moa | null>(null);
  const [toast,       setToast]       = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [roleChange,  setRoleChange]  = useState<string>('');
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ── Fetch ────────────────────────────────────────────────────────────────

  const fetchMoas = useCallback(async () => {
    // Faculty view rules:
    // ✅ Filter out deleted rows (deleted_at IS NULL)
    // ✅ Show all statuses
    // ❌ No deleted_at column in select
    // ❌ No audit trail
    const { data } = await supabase
      .from('moas')
      .select('id, hteid, title, partner_name, address, contact_person, contact_email, contact_phone, effective_date, expiry_date, status, college_office, notes, created_at')
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

    // Real-time role change listener
    channelRef.current = supabase
      .channel(`staff-role-${user.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` }, (payload) => {
        const newRole = payload.new?.role;
        if (newRole === 'student') {
          setRoleChange("Your role has been changed to Student. Redirecting…");
          setTimeout(() => { navigate('/dashboard', { replace: true }); window.location.reload(); }, 2800);
        }
        if (newRole === 'admin') {
          setRoleChange("You've been promoted to Admin! Redirecting…");
          setTimeout(() => navigate('/admin-dashboard', { replace: true }), 2800);
        }
      })
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

  // ── Derived ──────────────────────────────────────────────────────────────

  const colleges = Array.from(new Set(moas.map(m => m.college_office).filter(Boolean))).sort();

  // Day 3: multi-field search — College, Title, Contact Person, Company, HTEID, Address, Notes
  const filtered = moas.filter(m => {
    const q = search.toLowerCase();
    const matchSearch = !q || [
      m.partner_name, m.hteid, m.title, m.college_office,
      m.contact_person, m.contact_email, m.contact_phone,
      m.address, m.notes,
    ].some(f => f?.toLowerCase().includes(q));

    const matchCollege = collegeFilter === 'all' || m.college_office === collegeFilter;
    const matchStatus  = statusFilter  === 'all' || m.status === statusFilter;

    const effDate = m.effective_date ? new Date(m.effective_date) : null;
    const matchFrom = !dateFrom || (effDate && effDate >= new Date(dateFrom));
    const matchTo   = !dateTo   || (effDate && effDate <= new Date(dateTo + 'T23:59:59'));

    return matchSearch && matchCollege && matchStatus && matchFrom && matchTo;
  });

  const now = new Date();

  // Day 1: Statistics cards
  const statsCards = [
    { label: 'Total Active',    value: moas.filter(m => m.status === 'approved').length,                                                       icon: '✅', color: '#34d399', bg: 'rgba(16,185,129,0.08)',  border: 'rgba(16,185,129,0.2)'  },
    { label: 'Under Process',   value: moas.filter(m => ['pending', 'draft'].includes(m.status)).length,                                        icon: '⏳', color: '#fbbf24', bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.2)'  },
    { label: 'Expired',         value: moas.filter(m => m.status === 'expired' || (m.expiry_date && new Date(m.expiry_date) < now)).length,     icon: '📅', color: '#94a3b8', bg: 'rgba(100,116,139,0.08)', border: 'rgba(100,116,139,0.2)' },
    { label: 'Rejected',        value: moas.filter(m => m.status === 'rejected').length,                                                        icon: '🚫', color: '#f87171', bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.2)'   },
  ];

  const hasActiveFilters = collegeFilter !== 'all' || statusFilter !== 'all' || dateFrom || dateTo;
  const clearFilters = () => { setCollegeFilter('all'); setStatusFilter('all'); setDateFrom(''); setDateTo(''); };

  const th: React.CSSProperties = { padding: '0.65rem 1.25rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em' };
  const td: React.CSSProperties = { padding: '0.9rem 1.25rem', borderBottom: '1px solid rgba(30,41,59,0.5)', fontSize: '0.875rem', color: '#cbd5e1' };
  const inputStyle: React.CSSProperties = { padding: '0.42rem 0.75rem', background: '#0a0f1e', border: '1px solid #1e293b', borderRadius: '0.5rem', color: '#e2e8f0', fontSize: '0.8rem', outline: 'none', fontFamily: 'inherit' };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: '100vh', background: '#020817', color: '#e2e8f0', display: 'flex' }}>

      {/* Role change banner */}
      {roleChange && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200, background: 'linear-gradient(90deg, #1e3a5f, #1e40af)', color: 'white', padding: '1rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', boxShadow: '0 4px 24px rgba(30,64,175,0.4)' }}>
          <span style={{ fontSize: '1rem' }}>🔄</span>
          <span style={{ fontWeight: 600, fontSize: '0.92rem' }}>{roleChange}</span>
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
          onSuccess={() => { setShowForm(false); setEditTarget(null); fetchMoas(); showToast(editTarget ? 'MOA updated.' : 'MOA created.'); }}
          onCancel={() => { setShowForm(false); setEditTarget(null); }}
        />
      )}

      {/* Sidebar */}
      <div style={{ position: 'fixed', left: 0, top: 0, height: '100%', width: '4rem', background: '#0a0f1e', borderRight: '1px solid #1e293b', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '1.5rem 0', gap: '0.5rem', zIndex: 20 }}>
        <div style={{ width: '2.25rem', height: '2.25rem', background: '#7c3aed', borderRadius: '0.625rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
          </svg>
        </div>
        <div style={{ marginTop: '0.75rem', width: '2.25rem', height: '2.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '0.625rem', background: 'rgba(124,58,237,0.15)', color: '#a78bfa' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
          </svg>
        </div>
        <div style={{ flex: 1 }} />
        <button onClick={signOutUser} title="Sign Out"
          style={{ width: '2.25rem', height: '2.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '0.625rem', border: 'none', cursor: 'pointer', background: 'transparent', color: '#475569', fontFamily: 'inherit' }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#f87171'; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.1)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#475569'; (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
        </button>
      </div>

      {/* Main */}
      <div style={{ marginLeft: '4rem', flex: 1, display: 'flex', flexDirection: 'column' }}>

        {/* Topbar */}
        <header style={{ position: 'sticky', top: 0, zIndex: 10, background: 'rgba(2,8,23,0.9)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #1e293b', padding: '1rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: '#f1f5f9' }}>Welcome, {profile?.first_name || 'Staff'} 👋</div>
            <div style={{ fontSize: '0.72rem', color: '#475569', marginTop: '0.1rem' }}>{user?.email}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {profile?.college_office && <span style={{ color: '#64748b', fontSize: '0.78rem' }}>{profile.college_office}</span>}
            <span style={{ padding: '0.25rem 0.7rem', background: 'rgba(124,58,237,0.12)', color: '#a78bfa', border: '1px solid rgba(124,58,237,0.2)', borderRadius: '0.5rem', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Staff / Maintainer
            </span>
          </div>
        </header>

        <main style={{ padding: '2rem', flex: 1 }}>

          {/* Faculty View Notice */}
          <div style={{ background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.18)', borderRadius: '0.75rem', padding: '0.65rem 1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'flex-start', gap: '0.65rem' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginTop: '0.1rem', flexShrink: 0 }}>
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <div style={{ fontSize: '0.78rem', color: '#a78bfa', lineHeight: 1.6 }}>
              <strong>Faculty / Staff View</strong> — All active MOAs across all statuses. Deleted entries and the audit trail are Admin-only.
            </div>
          </div>

          {/* ── Day 1: Statistics Cards ───────────────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '1rem', marginBottom: '1.75rem' }}>
            {statsCards.map(s => (
              <div key={s.label} style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: '0.875rem', padding: '1.1rem 1.4rem' }}>
                <div style={{ fontSize: '1.5rem', marginBottom: '0.4rem' }}>{s.icon}</div>
                <div style={{ fontSize: '1.7rem', fontWeight: 900, color: s.color, lineHeight: 1 }}>{loading ? '—' : s.value}</div>
                <div style={{ fontSize: '0.62rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: '0.3rem' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* ── Day 2 + Day 3: Filter bar ─────────────────────────────── */}
          <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '0.875rem', padding: '0.875rem 1.25rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>

            {/* Multi-field search */}
            <div style={{ position: 'relative', flex: 1, minWidth: '200px', maxWidth: '320px' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)' }}>
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                placeholder="Search company, college, contact, HTEID…"
                value={search} onChange={e => setSearch(e.target.value)}
                style={{ ...inputStyle, width: '100%', paddingLeft: '2rem', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ width: '1px', height: '1.5rem', background: '#1e293b' }} />

            {/* College filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.68rem', color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', whiteSpace: 'nowrap' }}>College</label>
              <select value={collegeFilter} onChange={e => setCollegeFilter(e.target.value)} style={inputStyle}>
                <option value="all">All</option>
                {colleges.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* Status filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.68rem', color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Status</label>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={inputStyle}>
                <option value="all">All</option>
                {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>

            {/* Date range */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.68rem', color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', whiteSpace: 'nowrap' }}>From</label>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={inputStyle} />
              <label style={{ fontSize: '0.68rem', color: '#475569', fontWeight: 700 }}>To</label>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={inputStyle} />
            </div>

            {hasActiveFilters && (
              <button onClick={clearFilters} style={{ ...inputStyle, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}>
                ✕ Clear
              </button>
            )}

            <button onClick={() => { setEditTarget(null); setShowForm(true); }}
              style={{ marginLeft: 'auto', padding: '0.5rem 1.1rem', background: '#7c3aed', border: 'none', borderRadius: '0.5rem', color: 'white', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
              + New MOA
            </button>
          </div>

          {/* MOA Table */}
          <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '1rem', overflow: 'hidden' }}>
            <div style={{ padding: '0.875rem 1.5rem', borderBottom: '1px solid #1e293b', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>MOA Records</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {hasActiveFilters && (
                  <span style={{ fontSize: '0.7rem', color: '#a78bfa', background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: '0.4rem', padding: '0.15rem 0.5rem', fontWeight: 600 }}>Filtered</span>
                )}
                <span style={{ color: '#475569', fontSize: '0.75rem' }}>{filtered.length} record{filtered.length !== 1 ? 's' : ''}</span>
              </div>
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
                      {search || hasActiveFilters ? 'No records match the current filters.' : 'No MOAs yet — click "+ New MOA" to add one.'}
                    </td></tr>
                  ) : filtered.map(moa => (
                    <tr key={moa.id} style={{ borderBottom: '1px solid rgba(30,41,59,0.4)' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(255,255,255,0.018)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'; }}
                    >
                      <td style={{ ...td, fontFamily: 'monospace', fontSize: '0.8rem', color: '#94a3b8' }}>{moa.hteid || '—'}</td>
                      <td style={td}>
                        <div style={{ color: '#f1f5f9', fontWeight: 700, fontSize: '0.875rem' }}>{moa.partner_name}</div>
                        {moa.title && <div style={{ color: '#94a3b8', fontSize: '0.78rem', marginTop: '0.12rem' }}>{moa.title}</div>}
                      </td>
                      <td style={{ ...td, color: '#cbd5e1', fontSize: '0.85rem', maxWidth: '160px' }}>
                        <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{moa.address || '—'}</span>
                      </td>
                      <td style={{ ...td, fontSize: '0.78rem' }}>
                        {moa.contact_person && <div style={{ color: '#e2e8f0', fontWeight: 500 }}>{moa.contact_person}</div>}
                        {moa.contact_email  && <div style={{ color: '#94a3b8', fontSize: '0.78rem' }}>{moa.contact_email}</div>}
                        {moa.contact_phone  && <div style={{ color: '#94a3b8', fontSize: '0.78rem' }}>{moa.contact_phone}</div>}
                        {!moa.contact_person && !moa.contact_email && !moa.contact_phone && <span style={{ color: '#334155' }}>—</span>}
                      </td>
                      <td style={{ ...td, color: '#cbd5e1', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>{fmtDate(moa.effective_date)}</td>
                      <td style={td}><StatusBadge status={moa.status} /></td>
                      <td style={{ ...td, textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button onClick={() => { setEditTarget(moa); setShowForm(true); }}
                          style={{ padding: '0.25rem 0.6rem', fontSize: '0.73rem', fontWeight: 600, border: '1px solid #1e293b', background: '#0f172a', color: '#94a3b8', borderRadius: '0.45rem', cursor: 'pointer', fontFamily: 'inherit', marginLeft: '0.3rem' }}>
                          Edit
                        </button>
                        <button onClick={() => handleDelete(moa)}
                          style={{ padding: '0.25rem 0.6rem', fontSize: '0.73rem', fontWeight: 600, border: '1px solid rgba(239,68,68,0.25)', background: 'rgba(239,68,68,0.08)', color: '#f87171', borderRadius: '0.45rem', cursor: 'pointer', fontFamily: 'inherit', marginLeft: '0.3rem' }}>
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