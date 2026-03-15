import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { UserAuth } from '../context/AuthContext';
import { logAudit } from './auditLogger';
import MoaForm from './MoaForm';

// ─── Types ──────────────────────────────────────────────────────────────────

type Role = 'student' | 'staff' | 'admin';
type Tab  = 'moas' | 'trash' | 'audit' | 'users';

interface Moa {
  id: string; hteid: string; title: string; partner_name: string;
  address: string; contact_person: string; contact_email: string;
  contact_phone: string; effective_date: string; expiry_date: string | null;
  status: string; college_office: string; notes: string;
  deleted_at: string | null; created_at: string;
}

interface Profile {
  id: string; email: string; first_name: string; last_name: string;
  role: Role; college_office: string; is_blocked: boolean; created_at: string;
}

interface AuditLog {
  id: string; user_id: string; action: string; target_table: string;
  details: Record<string, unknown>; created_at: string;
}

// ─── Status config (Day 5 — all 6 statuses clearly differentiated) ──────────

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; border: string; dot: string }> = {
  approved: { label: 'Approved',    color: '#34d399', bg: 'rgba(16,185,129,0.12)',  border: 'rgba(16,185,129,0.25)',  dot: '#10b981' },
  pending:  { label: 'Pending',     color: '#fbbf24', bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.25)',  dot: '#f59e0b' },
  draft:    { label: 'Draft',       color: '#60a5fa', bg: 'rgba(59,130,246,0.12)',  border: 'rgba(59,130,246,0.25)',  dot: '#3b82f6' },
  expired:  { label: 'Expired',     color: '#94a3b8', bg: 'rgba(100,116,139,0.12)', border: 'rgba(100,116,139,0.25)', dot: '#64748b' },
  rejected: { label: 'Rejected',    color: '#f87171', bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.25)',   dot: '#ef4444' },
  inactive: { label: 'Inactive',    color: '#c084fc', bg: 'rgba(192,132,252,0.12)', border: 'rgba(192,132,252,0.25)', dot: '#a855f7' },
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

const ACTION_CFG: Record<string, { color: string; bg: string; border: string }> = {
  INSERT:  { color: '#34d399', bg: 'rgba(16,185,129,0.1)',  border: 'rgba(16,185,129,0.2)' },
  UPDATE:  { color: '#60a5fa', bg: 'rgba(59,130,246,0.1)',  border: 'rgba(59,130,246,0.2)' },
  DELETE:  { color: '#f87171', bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.2)'  },
  RESTORE: { color: '#fbbf24', bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.2)' },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';
const fmtDateTime = (d: string) =>
  new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

// ─── History Modal (Day 4 — per-MOA audit trail) ─────────────────────────────

const HistoryModal = ({ moa, onClose }: { moa: Moa; onClose: () => void }) => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('audit_logs')
      .select('*')
      .contains('details', { id: moa.id })
      .order('created_at', { ascending: false })
      .then(({ data }) => { if (data) setLogs(data as AuditLog[]); setLoading(false); });
  }, [moa.id]);

  const td: React.CSSProperties = { padding: '0.75rem 1rem', borderBottom: '1px solid rgba(30,41,59,0.5)', fontSize: '0.875rem', color: '#cbd5e1' };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(2,8,23,0.85)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
      <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '1.25rem', width: '100%', maxWidth: '640px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 64px rgba(0,0,0,0.6)' }}>
        {/* Header */}
        <div style={{ padding: '1.1rem 1.5rem', borderBottom: '1px solid #1e293b', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div style={{ color: '#f1f5f9', fontWeight: 800, fontSize: '0.95rem' }}>MOA History</div>
            <div style={{ color: '#475569', fontSize: '0.75rem', marginTop: '0.2rem' }}>
              {moa.partner_name} {moa.hteid ? `· ${moa.hteid}` : ''}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: '1px solid #1e293b', borderRadius: '0.45rem', color: '#64748b', padding: '0.3rem 0.55rem', cursor: 'pointer', fontSize: '0.85rem', lineHeight: 1 }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#475569' }}>Loading history…</div>
          ) : logs.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#475569' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📭</div>
              No audit history for this MOA yet.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #1e293b' }}>
                  {['Action', 'User', 'Details', 'When'].map(h => (
                    <th key={h} style={{ padding: '0.6rem 1rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map(log => {
                  const ac = ACTION_CFG[log.action] ?? { color: '#94a3b8', bg: '#1e293b', border: '#334155' };
                  return (
                    <tr key={log.id} style={{ borderBottom: '1px solid rgba(30,41,59,0.4)' }}>
                      <td style={td}>
                        <span style={{ padding: '0.18rem 0.5rem', borderRadius: '0.35rem', background: ac.bg, color: ac.color, border: `1px solid ${ac.border}`, fontSize: '0.68rem', fontWeight: 700, fontFamily: 'monospace' }}>{log.action}</span>
                      </td>
                      <td style={{ ...td, color: '#94a3b8', fontSize: '0.78rem', fontFamily: 'monospace' }}>
                        <span title={log.user_id}>{log.user_id?.slice(0, 8)}…</span>
                      </td>
                      <td style={{ ...td, color: '#64748b', fontSize: '0.75rem', maxWidth: '200px' }}>
                        <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {log.details ? JSON.stringify(log.details) : '—'}
                        </span>
                      </td>
                      <td style={{ ...td, color: '#475569', fontSize: '0.72rem', whiteSpace: 'nowrap' }}>{fmtDateTime(log.created_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────

const AdminDashboard = () => {
  const { user, signOutUser } = UserAuth();

  // Navigation
  const [tab, setTab] = useState<Tab>('moas');

  // Data
  const [moas,     setMoas]     = useState<Moa[]>([]);
  const [trash,    setTrash]    = useState<Moa[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [auditLogs,setAuditLogs]= useState<AuditLog[]>([]);
  const [loading,  setLoading]  = useState(true);

  // Search & filters (Day 2 + Day 3)
  const [search,       setSearch]       = useState('');
  const [collegeFilter,setCollegeFilter]= useState('all');
  const [dateFrom,     setDateFrom]     = useState('');
  const [dateTo,       setDateTo]       = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // UI state
  const [showForm,     setShowForm]     = useState(false);
  const [editTarget,   setEditTarget]   = useState<Moa | null>(null);
  const [historyMoa,   setHistoryMoa]   = useState<Moa | null>(null);
  const [toast,        setToast]        = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  };

  // ── Fetch ────────────────────────────────────────────────────────────────

  const fetchMoas     = useCallback(async () => { const { data } = await supabase.from('moas').select('*').is('deleted_at', null).order('created_at', { ascending: false }); if (data) setMoas(data as Moa[]); }, []);
  const fetchTrash    = useCallback(async () => { const { data } = await supabase.from('moas').select('*').not('deleted_at', 'is', null).order('deleted_at', { ascending: false }); if (data) setTrash(data as Moa[]); }, []);
  const fetchProfiles = useCallback(async () => { const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false }); if (data) setProfiles(data as Profile[]); }, []);
  const fetchAudit    = useCallback(async () => { const { data } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(150); if (data) setAuditLogs(data as AuditLog[]); }, []);
  const refreshAll    = useCallback(() => Promise.all([fetchMoas(), fetchTrash(), fetchProfiles(), fetchAudit()]), [fetchMoas, fetchTrash, fetchProfiles, fetchAudit]);

  useEffect(() => { setLoading(true); refreshAll().finally(() => setLoading(false)); }, [refreshAll]);

  // ── Actions ──────────────────────────────────────────────────────────────

  const handleDelete = async (moa: Moa) => {
    if (!confirm(`Soft-delete "${moa.partner_name}"?`)) return;
    await supabase.from('moas').update({ deleted_at: new Date().toISOString() }).eq('id', moa.id);
    await logAudit(user!.id, 'DELETE', 'moas', { id: moa.id, partner: moa.partner_name });
    showToast(`"${moa.partner_name}" moved to trash.`);
    fetchMoas(); fetchTrash(); fetchAudit();
  };

  const handleRestore = async (moa: Moa) => {
    await supabase.from('moas').update({ deleted_at: null }).eq('id', moa.id);
    await logAudit(user!.id, 'RESTORE', 'moas', { id: moa.id, partner: moa.partner_name });
    showToast(`"${moa.partner_name}" restored.`);
    fetchMoas(); fetchTrash(); fetchAudit();
  };

  const handlePermDelete = async (moa: Moa) => {
    if (!confirm(`PERMANENTLY delete "${moa.partner_name}"? Cannot be undone.`)) return;
    await supabase.from('moas').delete().eq('id', moa.id);
    await logAudit(user!.id, 'DELETE', 'moas', { id: moa.id, partner: moa.partner_name, permanent: true });
    showToast('Permanently deleted.', 'error');
    fetchTrash(); fetchAudit();
  };

  const updateRole = async (id: string, role: Role) => {
    await supabase.from('profiles').update({ role }).eq('id', id);
    await logAudit(user!.id, 'UPDATE', 'profiles', { target_user: id, new_role: role });
    showToast('Role updated.'); fetchProfiles(); fetchAudit();
  };

  const toggleBlock = async (id: string, current: boolean) => {
    await supabase.from('profiles').update({ is_blocked: !current }).eq('id', id);
    await logAudit(user!.id, 'UPDATE', 'profiles', { target_user: id, is_blocked: !current });
    showToast(current ? 'User unblocked.' : 'User blocked.'); fetchProfiles(); fetchAudit();
  };

  // ── Derived data ─────────────────────────────────────────────────────────

  // Unique college list for filter dropdown
  const colleges = Array.from(new Set(moas.map(m => m.college_office).filter(Boolean))).sort();

  // Day 3 — multi-field search across College, Industry/Title, Contact Person, Company Name, HTEID, Address, Notes
  const filteredMoas = moas.filter(m => {
    const q = search.toLowerCase();
    const matchSearch = !q || [
      m.partner_name, m.hteid, m.title, m.college_office,
      m.contact_person, m.contact_email, m.contact_phone,
      m.address, m.notes,
    ].some(f => f?.toLowerCase().includes(q));

    const matchCollege = collegeFilter === 'all' || m.college_office === collegeFilter;
    const matchStatus  = statusFilter  === 'all' || m.status === statusFilter;

    // Day 2 — date range filter on effective_date
    const effDate = m.effective_date ? new Date(m.effective_date) : null;
    const matchFrom = !dateFrom || (effDate && effDate >= new Date(dateFrom));
    const matchTo   = !dateTo   || (effDate && effDate <= new Date(dateTo + 'T23:59:59'));

    return matchSearch && matchCollege && matchStatus && matchFrom && matchTo;
  });

  const filteredUsers = profiles.filter(p => {
    const q = search.toLowerCase();
    return !q || [p.email, p.first_name, p.last_name, p.college_office].some(f => f?.toLowerCase().includes(q));
  });

  // Day 1 — Statistics for the header cards
  const now = new Date();
  const statsCards = [
    {
      label: 'Total Active',
      value: moas.filter(m => m.status === 'approved').length,
      sub: 'Approved MOAs',
      color: '#34d399', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.2)',
      icon: '✅',
    },
    {
      label: 'Under Process',
      value: moas.filter(m => ['pending', 'draft'].includes(m.status)).length,
      sub: 'Pending + Draft',
      color: '#fbbf24', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)',
      icon: '⏳',
    },
    {
      label: 'Expired',
      value: moas.filter(m => m.status === 'expired' || (m.expiry_date && new Date(m.expiry_date) < now)).length,
      sub: 'Past expiry date',
      color: '#94a3b8', bg: 'rgba(100,116,139,0.08)', border: 'rgba(100,116,139,0.2)',
      icon: '📅',
    },
    {
      label: 'Rejected',
      value: moas.filter(m => m.status === 'rejected').length,
      sub: 'Rejected MOAs',
      color: '#f87171', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.2)',
      icon: '🚫',
    },
    {
      label: 'In Trash',
      value: trash.length,
      sub: 'Soft deleted',
      color: '#c084fc', bg: 'rgba(192,132,252,0.08)', border: 'rgba(192,132,252,0.2)',
      icon: '🗑',
    },
    {
      label: 'Total Users',
      value: profiles.length,
      sub: 'Registered accounts',
      color: '#818cf8', bg: 'rgba(99,102,241,0.08)', border: 'rgba(99,102,241,0.2)',
      icon: '👥',
    },
  ];

  // ── Style constants ───────────────────────────────────────────────────────

  const card: React.CSSProperties = { background: '#0f172a', border: '1px solid #1e293b', borderRadius: '1rem', overflow: 'hidden' };
  const th:   React.CSSProperties = { padding: '0.65rem 1.25rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em' };
  const td:   React.CSSProperties = { padding: '0.9rem 1.25rem', borderBottom: '1px solid rgba(30,41,59,0.5)', fontSize: '0.875rem', color: '#cbd5e1' };

  const Btn = ({ onClick, danger, ghost, sm, children }: { onClick: () => void; danger?: boolean; ghost?: boolean; sm?: boolean; children: React.ReactNode }) => (
    <button onClick={onClick} style={{
      padding: sm ? '0.25rem 0.6rem' : '0.45rem 0.9rem', fontSize: '0.73rem', fontWeight: 600,
      border: `1px solid ${danger ? 'rgba(239,68,68,0.25)' : ghost ? 'rgba(99,102,241,0.25)' : '#1e293b'}`,
      background: danger ? 'rgba(239,68,68,0.08)' : ghost ? 'rgba(99,102,241,0.08)' : '#0f172a',
      color: danger ? '#f87171' : ghost ? '#818cf8' : '#94a3b8',
      borderRadius: '0.45rem', cursor: 'pointer', fontFamily: 'inherit', marginLeft: '0.3rem', transition: 'all 0.15s',
    }}>{children}</button>
  );

  const inputStyle: React.CSSProperties = { padding: '0.42rem 0.75rem', background: '#0a0f1e', border: '1px solid #1e293b', borderRadius: '0.5rem', color: '#e2e8f0', fontSize: '0.8rem', outline: 'none', fontFamily: 'inherit' };

  const SideNav = ({ id, label, icon }: { id: Tab; label: string; icon: string }) => (
    <button title={label} onClick={() => { setTab(id); setSearch(''); }}
      style={{ width: '2.25rem', height: '2.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '0.625rem', border: 'none', cursor: 'pointer', fontFamily: 'inherit', background: tab === id ? 'rgba(245,158,11,0.15)' : 'transparent', color: tab === id ? '#fbbf24' : '#475569', fontSize: '1rem', transition: 'all 0.15s' }}>
      {icon}
    </button>
  );

  const hasActiveFilters = collegeFilter !== 'all' || statusFilter !== 'all' || dateFrom || dateTo;

  const clearFilters = () => { setCollegeFilter('all'); setStatusFilter('all'); setDateFrom(''); setDateTo(''); };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: '100vh', background: '#020817', color: '#e2e8f0', display: 'flex' }}>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: '1.5rem', right: '1.5rem', zIndex: 110, padding: '0.75rem 1.25rem', borderRadius: '0.75rem', background: toast.type === 'success' ? '#059669' : '#dc2626', color: 'white', fontWeight: 600, fontSize: '0.875rem', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
          {toast.msg}
        </div>
      )}

      {/* MOA Form */}
      {showForm && (
        <MoaForm
          initial={editTarget ? { ...editTarget, id: editTarget.id, expiry_date: editTarget.expiry_date ?? undefined } : undefined}
          onSuccess={() => { setShowForm(false); setEditTarget(null); fetchMoas(); fetchAudit(); showToast(editTarget ? 'MOA updated.' : 'MOA created.'); }}
          onCancel={() => { setShowForm(false); setEditTarget(null); }}
        />
      )}

      {/* History Modal (Day 4) */}
      {historyMoa && <HistoryModal moa={historyMoa} onClose={() => setHistoryMoa(null)} />}

      {/* Sidebar */}
      <div style={{ position: 'fixed', left: 0, top: 0, height: '100%', width: '4rem', background: '#0a0f1e', borderRight: '1px solid #1e293b', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '1.5rem 0', gap: '0.25rem', zIndex: 20 }}>
        <div style={{ width: '2.25rem', height: '2.25rem', background: '#d97706', borderRadius: '0.625rem', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem', flexShrink: 0 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        </div>
        <SideNav id="moas"  label="MOA Records"    icon="📋" />
        <SideNav id="trash" label="Trash"           icon="🗑" />
        <SideNav id="audit" label="Audit Logs"      icon="📝" />
        <SideNav id="users" label="User Management" icon="👥" />
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
            <div style={{ fontWeight: 700, fontSize: '1rem', color: '#f1f5f9' }}>⬡ Admin Dashboard</div>
            <div style={{ fontSize: '0.72rem', color: '#475569', marginTop: '0.1rem' }}>{user?.email}</div>
          </div>
          <span style={{ padding: '0.25rem 0.7rem', background: 'rgba(245,158,11,0.12)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '0.5rem', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Administrator
          </span>
        </header>

        <main style={{ padding: '2rem', flex: 1 }}>

          {/* ── Day 1: Statistics Cards ───────────────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: '0.875rem', marginBottom: '1.75rem' }}>
            {statsCards.map(s => (
              <div key={s.label} style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: '0.875rem', padding: '1rem 1.1rem', position: 'relative', overflow: 'hidden' }}>
                <div style={{ fontSize: '1.5rem', marginBottom: '0.4rem' }}>{s.icon}</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 900, color: s.color, lineHeight: 1 }}>{loading ? '—' : s.value}</div>
                <div style={{ fontSize: '0.62rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: '0.3rem' }}>{s.label}</div>
                <div style={{ fontSize: '0.6rem', color: '#334155', marginTop: '0.15rem' }}>{s.sub}</div>
              </div>
            ))}
          </div>

          {/* ── Day 2: College + Date Range filter bar (MOAs tab only) ── */}
          {tab === 'moas' && (
            <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '0.875rem', padding: '0.875rem 1.25rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>

              {/* Day 3: General search bar — multi-field */}
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
                style={{ marginLeft: 'auto', padding: '0.5rem 1.1rem', background: '#059669', border: 'none', borderRadius: '0.5rem', color: 'white', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                + New MOA
              </button>
            </div>
          )}

          {/* ── MOA Records tab ────────────────────────────────────────── */}
          {tab === 'moas' && (
            <div style={card}>
              <div style={{ padding: '0.875rem 1.5rem', borderBottom: '1px solid #1e293b', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>MOA Records</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  {hasActiveFilters && (
                    <span style={{ fontSize: '0.7rem', color: '#fbbf24', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '0.4rem', padding: '0.15rem 0.5rem', fontWeight: 600 }}>
                      Filtered
                    </span>
                  )}
                  <span style={{ color: '#475569', fontSize: '0.75rem' }}>{filteredMoas.length} record{filteredMoas.length !== 1 ? 's' : ''}</span>
                </div>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #1e293b' }}>
                      {['HTEID', 'Partner / Company', 'College / Office', 'Contact', 'Effective Date', 'Status', 'Actions'].map(h => (
                        <th key={h} style={{ ...th, textAlign: h === 'Actions' ? 'right' : 'left' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={7} style={{ ...td, textAlign: 'center', color: '#475569', padding: '3rem' }}>Loading…</td></tr>
                    ) : filteredMoas.length === 0 ? (
                      <tr><td colSpan={7} style={{ ...td, textAlign: 'center', color: '#475569', padding: '3rem' }}>
                        {search || hasActiveFilters ? 'No records match the current filters.' : 'No MOAs yet — click "+ New MOA" to get started.'}
                      </td></tr>
                    ) : filteredMoas.map(moa => (
                      <tr key={moa.id} style={{ borderBottom: '1px solid rgba(30,41,59,0.4)' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(255,255,255,0.018)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'; }}
                      >
                        <td style={{ ...td, fontFamily: 'monospace', fontSize: '0.8rem', color: '#94a3b8' }}>{moa.hteid || '—'}</td>
                        <td style={td}>
                          <div style={{ color: '#f1f5f9', fontWeight: 600, fontSize: '0.85rem' }}>{moa.partner_name}</div>
                          {moa.title && <div style={{ color: '#94a3b8', fontSize: '0.78rem', marginTop: '0.12rem' }}>{moa.title}</div>}
                          {moa.address && <div style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '0.08rem' }}>{moa.address}</div>}
                        </td>
                        <td style={{ ...td, color: '#64748b', fontSize: '0.8rem' }}>{moa.college_office || '—'}</td>
                        <td style={{ ...td, fontSize: '0.78rem' }}>
                          {moa.contact_person && <div style={{ color: '#e2e8f0', fontWeight: 500 }}>{moa.contact_person}</div>}
                          {moa.contact_email  && <div style={{ color: '#94a3b8', fontSize: '0.78rem' }}>{moa.contact_email}</div>}
                        </td>
                        <td style={{ ...td, color: '#cbd5e1', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>{fmtDate(moa.effective_date)}</td>
                        <td style={td}><StatusBadge status={moa.status} /></td>
                        <td style={{ ...td, textAlign: 'right', whiteSpace: 'nowrap' }}>
                          {/* Day 4: History button per MOA */}
                          <Btn onClick={() => setHistoryMoa(moa)} ghost sm>History</Btn>
                          <Btn onClick={() => { setEditTarget(moa); setShowForm(true); }} sm>Edit</Btn>
                          <Btn onClick={() => handleDelete(moa)} danger sm>Delete</Btn>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Trash tab ──────────────────────────────────────────────── */}
          {tab === 'trash' && (
            <div style={card}>
              <div style={{ padding: '0.875rem 1.5rem', borderBottom: '1px solid #1e293b' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Trash — Soft Deleted Records</div>
                <div style={{ color: '#475569', fontSize: '0.72rem', marginTop: '0.2rem' }}>Only admins can view and recover deleted entries.</div>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr style={{ borderBottom: '1px solid #1e293b' }}>
                    {['HTEID','Partner / Company','Status','Deleted On','Actions'].map(h => (
                      <th key={h} style={{ ...th, textAlign: h === 'Actions' ? 'right' : 'left' }}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {trash.length === 0 ? (
                      <tr><td colSpan={5} style={{ ...td, textAlign: 'center', color: '#475569', padding: '3rem' }}>Trash is empty.</td></tr>
                    ) : trash.map(moa => (
                      <tr key={moa.id} style={{ borderBottom: '1px solid rgba(30,41,59,0.4)', opacity: 0.7 }}
                        onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(255,255,255,0.01)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'; }}
                      >
                        <td style={{ ...td, fontFamily: 'monospace', fontSize: '0.8rem', color: '#94a3b8' }}>{moa.hteid || '—'}</td>
                        <td style={{...td, color: '#e2e8f0', fontWeight: 700 }}>
                          {moa.partner_name}
                          {moa.title && <div style={{ color: '#334155', fontSize: '0.72rem', marginTop: '0.1rem' }}>{moa.title}</div>}
                        </td>
                        <td style={td}><StatusBadge status={moa.status} /></td>
                        <td style={{ ...td, color: '#cbd5e1', fontSize: '0.85rem' }}>{fmtDate(moa.deleted_at)}</td>
                        <td style={{ ...td, textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <Btn onClick={() => handleRestore(moa)} sm>↩ Recover</Btn>
                          <Btn onClick={() => handlePermDelete(moa)} danger sm>Delete Forever</Btn>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Audit Logs tab ─────────────────────────────────────────── */}
          {tab === 'audit' && (
            <div style={card}>
              <div style={{ padding: '0.875rem 1.5rem', borderBottom: '1px solid #1e293b', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Audit Trail</div>
                  <div style={{ color: '#475569', fontSize: '0.72rem', marginTop: '0.2rem' }}>Every INSERT, UPDATE, DELETE, and RESTORE — last 150 entries</div>
                </div>
                <div style={{ position: 'relative' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)' }}>
                    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  </svg>
                  <input placeholder="Filter by action, table…" value={search} onChange={e => setSearch(e.target.value)} style={{ ...inputStyle, paddingLeft: '2rem' }} />
                </div>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr style={{ borderBottom: '1px solid #1e293b' }}>
                    {['Action','Table','User ID','Details','Timestamp'].map(h => (
                      <th key={h} style={th}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {auditLogs
                      .filter(l => !search || l.action?.toLowerCase().includes(search.toLowerCase()) || l.target_table?.toLowerCase().includes(search.toLowerCase()))
                      .map(log => {
                        const ac = ACTION_CFG[log.action] ?? { color: '#94a3b8', bg: '#1e293b', border: '#334155' };
                        return (
                          <tr key={log.id} style={{ borderBottom: '1px solid rgba(30,41,59,0.4)' }}
                            onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(255,255,255,0.01)'; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'; }}
                          >
                            <td style={td}>
                              <span style={{ padding: '0.18rem 0.5rem', borderRadius: '0.35rem', background: ac.bg, color: ac.color, border: `1px solid ${ac.border}`, fontSize: '0.7rem', fontWeight: 700, fontFamily: 'monospace' }}>{log.action}</span>
                            </td>
                            <td style={{ ...td, color: '#64748b', fontSize: '0.76rem', fontFamily: 'monospace' }}>{log.target_table}</td>
                            <td style={{ ...td, color: '#94a3b8', fontSize: '0.78rem', fontFamily: 'monospace' }}>
                              <span title={log.user_id}>{log.user_id?.slice(0, 8)}…</span>
                            </td>
                            <td style={{ ...td, color: '#cbd5e1', fontSize: '0.82rem', maxWidth: '280px' }}>
                              <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {log.details ? JSON.stringify(log.details) : '—'}
                              </span>
                            </td>
                            <td style={{ ...td, color: '#475569', fontSize: '0.74rem', whiteSpace: 'nowrap' }}>{fmtDateTime(log.created_at)}</td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── User Management tab ────────────────────────────────────── */}
          {tab === 'users' && (
            <div style={card}>
              <div style={{ padding: '0.875rem 1.5rem', borderBottom: '1px solid #1e293b', display: 'flex', alignItems: 'center', gap: '1rem', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  User Management <span style={{ color: '#334155', marginLeft: '0.5rem' }}>({profiles.length})</span>
                </div>
                <div style={{ position: 'relative' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)' }}>
                    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  </svg>
                  <input placeholder="Search users…" value={search} onChange={e => setSearch(e.target.value)} style={{ ...inputStyle, paddingLeft: '2rem' }} />
                </div>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr style={{ borderBottom: '1px solid #1e293b' }}>
                    {['User','Role','College / Office','Joined','Status'].map(h => (
                      <th key={h} style={th}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {filteredUsers.map(p => (
                      <tr key={p.id} style={{ borderBottom: '1px solid rgba(30,41,59,0.4)', opacity: p.is_blocked ? 0.5 : 1 }}
                        onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(255,255,255,0.015)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'; }}
                      >
                        <td style={td}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{ width: '1.9rem', height: '1.9rem', borderRadius: '50%', background: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', flexShrink: 0 }}>
                              {(p.first_name?.[0] || p.email?.[0] || '?').toUpperCase()}
                            </div>
                            <div>
                              <div style={{ color: '#f1f5f9', fontWeight: 700, fontSize: '0.875rem' }}>{p.first_name && p.last_name ? `${p.first_name} ${p.last_name}` : '—'}</div>
                              <div style={{ color: '#94a3b8', fontSize: '0.78rem' }}>{p.email}</div>
                            </div>
                          </div>
                        </td>
                        <td style={td}>
                          <select value={p.role} onChange={e => updateRole(p.id, e.target.value as Role)} disabled={p.email === user?.email}
                            style={{ background: '#0a0f1e', border: '1px solid #1e293b', color: '#e2e8f0', borderRadius: '0.4rem', padding: '0.25rem 0.5rem', fontSize: '0.76rem', fontFamily: 'inherit', cursor: 'pointer', outline: 'none' }}>
                            <option value="student">Student</option>
                            <option value="staff">Staff / Maintainer</option>
                            <option value="admin">Admin</option>
                          </select>
                        </td>
                        <td style={{ ...td, color: '#cbd5e1', fontSize: '0.85rem' }}>{p.college_office || '—'}</td>
                        <td style={{ ...td, color: '#94a3b8', fontSize: '0.82rem' }}>{fmtDate(p.created_at)}</td>
                        <td style={td}>
                          <button onClick={() => toggleBlock(p.id, p.is_blocked)} disabled={p.email === user?.email}
                            style={{ padding: '0.25rem 0.7rem', borderRadius: '0.4rem', border: '1px solid', borderColor: p.is_blocked ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.25)', background: p.is_blocked ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.08)', color: p.is_blocked ? '#f87171' : '#34d399', fontSize: '0.66rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', cursor: 'pointer', fontFamily: 'inherit', opacity: p.email === user?.email ? 0.3 : 1 }}>
                            {p.is_blocked ? 'Blocked' : 'Active'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;