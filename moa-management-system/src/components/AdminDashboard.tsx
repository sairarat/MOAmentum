import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { UserAuth } from '../context/AuthContext';
import { logAudit } from './auditLogger';
import MoaForm from './MoaForm';

// ─── Types ─────────────────────────────────────────────────────────────────

type Role = 'student' | 'staff' | 'admin';
type Tab = 'moas' | 'trash' | 'audit' | 'users';

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

// ─── Helpers ────────────────────────────────────────────────────────────────

const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

const fmtDateTime = (d: string) =>
  new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

const ActionBadge = ({ color, bg, border, text }: { color: string; bg: string; border: string; text: string }) => (
  <span style={{ padding: '0.2rem 0.55rem', borderRadius: '0.4rem', background: bg, color, border: `1px solid ${border}`, fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>{text}</span>
);

const STATUS_BADGE: Record<string, JSX.Element> = {
  approved: <ActionBadge color="#34d399" bg="rgba(16,185,129,0.12)"  border="rgba(16,185,129,0.2)"  text="Approved" />,
  pending:  <ActionBadge color="#fbbf24" bg="rgba(245,158,11,0.12)"  border="rgba(245,158,11,0.2)"  text="Pending"  />,
  draft:    <ActionBadge color="#60a5fa" bg="rgba(59,130,246,0.12)"  border="rgba(59,130,246,0.2)"  text="Draft"    />,
  expired:  <ActionBadge color="#94a3b8" bg="rgba(100,116,139,0.12)" border="rgba(100,116,139,0.2)" text="Expired"  />,
  rejected: <ActionBadge color="#f87171" bg="rgba(239,68,68,0.12)"  border="rgba(239,68,68,0.2)"   text="Rejected" />,
};

const ACTION_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  INSERT:  { bg: 'rgba(16,185,129,0.1)',  color: '#34d399', border: 'rgba(16,185,129,0.2)' },
  UPDATE:  { bg: 'rgba(59,130,246,0.1)',  color: '#60a5fa', border: 'rgba(59,130,246,0.2)' },
  DELETE:  { bg: 'rgba(239,68,68,0.1)',   color: '#f87171', border: 'rgba(239,68,68,0.2)'  },
  RESTORE: { bg: 'rgba(245,158,11,0.1)',  color: '#fbbf24', border: 'rgba(245,158,11,0.2)' },
};

// ─── Component ──────────────────────────────────────────────────────────────

const AdminDashboard = () => {
  const { user, signOutUser } = UserAuth();
  const [tab, setTab] = useState<Tab>('moas');
  const [moas, setMoas] = useState<Moa[]>([]);
  const [trash, setTrash] = useState<Moa[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Moa | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  };

  const fetchMoas    = useCallback(async () => { const { data } = await supabase.from('moas').select('*').is('deleted_at', null).order('created_at', { ascending: false }); if (data) setMoas(data as Moa[]); }, []);
  const fetchTrash   = useCallback(async () => { const { data } = await supabase.from('moas').select('*').not('deleted_at', 'is', null).order('deleted_at', { ascending: false }); if (data) setTrash(data as Moa[]); }, []);
  const fetchProfiles= useCallback(async () => { const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false }); if (data) setProfiles(data as Profile[]); }, []);
  const fetchAudit   = useCallback(async () => { const { data } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(100); if (data) setAuditLogs(data as AuditLog[]); }, []);

  const refreshAll = useCallback(() => Promise.all([fetchMoas(), fetchTrash(), fetchProfiles(), fetchAudit()]), [fetchMoas, fetchTrash, fetchProfiles, fetchAudit]);

  useEffect(() => { setLoading(true); refreshAll().finally(() => setLoading(false)); }, [refreshAll]);

  const handleDelete = async (moa: Moa) => {
    if (!confirm(`Soft-delete "${moa.partner_name}"? Admins can recover it from Trash.`)) return;
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
    if (!confirm(`PERMANENTLY delete "${moa.partner_name}"? This cannot be undone.`)) return;
    await supabase.from('moas').delete().eq('id', moa.id);
    await logAudit(user!.id, 'DELETE', 'moas', { id: moa.id, partner: moa.partner_name, permanent: true });
    showToast(`Permanently deleted.`, 'error');
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

  const filteredMoas = moas.filter(m =>
    m.partner_name?.toLowerCase().includes(search.toLowerCase()) ||
    m.hteid?.toLowerCase().includes(search.toLowerCase()) ||
    m.title?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredUsers = profiles.filter(p =>
    p.email?.toLowerCase().includes(search.toLowerCase()) ||
    `${p.first_name} ${p.last_name}`.toLowerCase().includes(search.toLowerCase())
  );

  // ─── Styles ─────────────────────────────────────────────────────────────

  const card: React.CSSProperties = { background: '#0f172a', border: '1px solid #1e293b', borderRadius: '1rem', overflow: 'hidden' };
  const th: React.CSSProperties = { padding: '0.7rem 1.25rem', textAlign: 'left', fontSize: '0.68rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em' };
  const td: React.CSSProperties = { padding: '0.875rem 1.25rem', borderBottom: '1px solid rgba(30,41,59,0.6)', fontSize: '0.84rem' };

  const Btn = ({ onClick, danger, sm, children }: { onClick: () => void; danger?: boolean; sm?: boolean; children: React.ReactNode }) => (
    <button onClick={onClick} style={{
      padding: sm ? '0.28rem 0.65rem' : '0.45rem 0.9rem',
      fontSize: '0.75rem', fontWeight: 600,
      border: `1px solid ${danger ? 'rgba(239,68,68,0.25)' : '#1e293b'}`,
      background: danger ? 'rgba(239,68,68,0.08)' : '#0f172a',
      color: danger ? '#f87171' : '#94a3b8',
      borderRadius: '0.45rem', cursor: 'pointer', fontFamily: 'inherit',
      marginLeft: '0.35rem', transition: 'all 0.15s',
    }}>{children}</button>
  );

  const SideNav = ({ id, label, icon }: { id: Tab; label: string; icon: string }) => (
    <button title={label} onClick={() => { setTab(id); setSearch(''); }} style={{
      width: '2.25rem', height: '2.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
      borderRadius: '0.625rem', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
      background: tab === id ? 'rgba(245,158,11,0.15)' : 'transparent',
      color: tab === id ? '#fbbf24' : '#475569', fontSize: '1rem',
      transition: 'all 0.15s',
    }}>{icon}</button>
  );

  const TableHeader = ({ cols }: { cols: { label: string; right?: boolean }[] }) => (
    <thead>
      <tr style={{ borderBottom: '1px solid #1e293b' }}>
        {cols.map(c => <th key={c.label} style={{ ...th, textAlign: c.right ? 'right' : 'left' }}>{c.label}</th>)}
      </tr>
    </thead>
  );

  const CardHeader = ({ title, sub, children }: { title: string; sub?: string; children?: React.ReactNode }) => (
    <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #1e293b', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' as const }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' as const, letterSpacing: '0.1em' }}>{title}</div>
        {sub && <div style={{ color: '#475569', fontSize: '0.73rem', marginTop: '0.2rem' }}>{sub}</div>}
      </div>
      {children}
    </div>
  );

  const searchInput = (
    <input
      placeholder={`Search ${tab === 'users' ? 'users' : 'MOAs'}…`}
      value={search} onChange={e => setSearch(e.target.value)}
      style={{ padding: '0.42rem 0.875rem', background: '#0a0f1e', border: '1px solid #1e293b', borderRadius: '0.5rem', color: '#e2e8f0', fontSize: '0.8rem', outline: 'none', fontFamily: 'inherit', width: '220px' }}
    />
  );

  const stats = [
    { label: 'Active MOAs',  value: moas.filter(m => m.status === 'approved').length, accent: 'rgba(16,185,129,0.2)',  num: '#34d399' },
    { label: 'Pending',      value: moas.filter(m => m.status === 'pending').length,  accent: 'rgba(245,158,11,0.2)',  num: '#fbbf24' },
    { label: 'In Trash',     value: trash.length,                                      accent: 'rgba(239,68,68,0.15)', num: '#f87171' },
    { label: 'Total Users',  value: profiles.length,                                   accent: 'rgba(99,102,241,0.2)', num: '#818cf8' },
  ];

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: '100vh', background: '#020817', color: '#e2e8f0', display: 'flex' }}>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: '1.5rem', right: '1.5rem', zIndex: 100, padding: '0.75rem 1.25rem', borderRadius: '0.75rem', background: toast.type === 'success' ? '#059669' : '#dc2626', color: 'white', fontWeight: 600, fontSize: '0.875rem', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
          {toast.msg}
        </div>
      )}

      {/* MOA Form modal */}
      {showForm && (
        <MoaForm
          initial={editTarget ? { ...editTarget, id: editTarget.id } : undefined}
          onSuccess={() => {
            setShowForm(false); setEditTarget(null);
            fetchMoas(); fetchAudit();
            showToast(editTarget ? 'MOA updated.' : 'MOA created.');
          }}
          onCancel={() => { setShowForm(false); setEditTarget(null); }}
        />
      )}

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
        <button onClick={signOutUser} title="Sign Out" style={{ width: '2.25rem', height: '2.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '0.625rem', border: 'none', cursor: 'pointer', background: 'transparent', color: '#475569', fontFamily: 'inherit' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
        </button>
      </div>

      {/* Main content */}
      <div style={{ marginLeft: '4rem', flex: 1, display: 'flex', flexDirection: 'column' }}>

        {/* Topbar */}
        <header style={{ position: 'sticky', top: 0, zIndex: 10, background: 'rgba(2,8,23,0.88)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #1e293b', padding: '1rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: '#f1f5f9' }}>⬡ Admin Dashboard</div>
            <div style={{ fontSize: '0.72rem', color: '#475569', marginTop: '0.1rem' }}>{user?.email}</div>
          </div>
          <span style={{ padding: '0.25rem 0.7rem', background: 'rgba(245,158,11,0.12)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '0.5rem', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Administrator
          </span>
        </header>

        <main style={{ padding: '2rem', flex: 1 }}>

          {/* Stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '1rem', marginBottom: '2rem' }}>
            {stats.map(s => (
              <div key={s.label} style={{ background: '#0f172a', border: `1px solid ${s.accent}`, borderRadius: '0.875rem', padding: '1.1rem 1.4rem' }}>
                <div style={{ fontSize: '1.75rem', fontWeight: 900, color: s.num, lineHeight: 1 }}>{loading ? '—' : s.value}</div>
                <div style={{ fontSize: '0.68rem', color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: '0.35rem' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* ── MOA Records tab ─────────────────────────────────────────── */}
          {tab === 'moas' && (
            <div style={card}>
              <CardHeader title="MOA Records" sub={`${filteredMoas.length} active record${filteredMoas.length !== 1 ? 's' : ''}`}>
                {searchInput}
                <button onClick={() => { setEditTarget(null); setShowForm(true); }}
                  style={{ padding: '0.5rem 1.1rem', background: '#059669', border: 'none', borderRadius: '0.5rem', color: 'white', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'inherit' }}>
                  + New MOA
                </button>
              </CardHeader>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <TableHeader cols={[{ label: 'HTEID' }, { label: 'Partner / Company' }, { label: 'College / Office' }, { label: 'Effective Date' }, { label: 'Status' }, { label: 'Actions', right: true }]} />
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={6} style={{ ...td, textAlign: 'center', color: '#475569', padding: '3rem' }}>Loading…</td></tr>
                    ) : filteredMoas.length === 0 ? (
                      <tr><td colSpan={6} style={{ ...td, textAlign: 'center', color: '#475569', padding: '3rem' }}>
                        {search ? 'No matching records.' : 'No MOAs yet — click "+ New MOA" to get started.'}
                      </td></tr>
                    ) : filteredMoas.map(moa => (
                      <tr key={moa.id} style={{ borderBottom: '1px solid rgba(30,41,59,0.5)' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(255,255,255,0.015)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'; }}
                      >
                        <td style={{ ...td, fontFamily: 'monospace', fontSize: '0.78rem', color: '#64748b' }}>{moa.hteid || '—'}</td>
                        <td style={td}>
                          <div style={{ color: '#f1f5f9', fontWeight: 600 }}>{moa.partner_name}</div>
                          {moa.title && <div style={{ color: '#475569', fontSize: '0.73rem', marginTop: '0.15rem' }}>{moa.title}</div>}
                          {moa.address && <div style={{ color: '#334155', fontSize: '0.72rem' }}>{moa.address}</div>}
                        </td>
                        <td style={{ ...td, color: '#64748b', fontSize: '0.8rem' }}>{moa.college_office || '—'}</td>
                        <td style={{ ...td, color: '#64748b', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>{fmtDate(moa.effective_date)}</td>
                        <td style={td}>{STATUS_BADGE[moa.status] ?? STATUS_BADGE['draft']}</td>
                        <td style={{ ...td, textAlign: 'right', whiteSpace: 'nowrap' }}>
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

          {/* ── Trash tab ───────────────────────────────────────────────── */}
          {tab === 'trash' && (
            <div style={card}>
              <CardHeader title="Trash — Soft Deleted Records" sub="Only admins can see and recover deleted entries. Permanent deletion is irreversible." />
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <TableHeader cols={[{ label: 'HTEID' }, { label: 'Partner / Company' }, { label: 'Status' }, { label: 'Deleted On' }, { label: 'Actions', right: true }]} />
                  <tbody>
                    {trash.length === 0 ? (
                      <tr><td colSpan={5} style={{ ...td, textAlign: 'center', color: '#475569', padding: '3rem' }}>Trash is empty.</td></tr>
                    ) : trash.map(moa => (
                      <tr key={moa.id} style={{ borderBottom: '1px solid rgba(30,41,59,0.5)', opacity: 0.7 }}
                        onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(255,255,255,0.01)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'; }}
                      >
                        <td style={{ ...td, fontFamily: 'monospace', fontSize: '0.78rem', color: '#64748b' }}>{moa.hteid || '—'}</td>
                        <td style={{ ...td, color: '#94a3b8', fontWeight: 600 }}>
                          {moa.partner_name}
                          {moa.title && <div style={{ color: '#334155', fontSize: '0.73rem', marginTop: '0.1rem' }}>{moa.title}</div>}
                        </td>
                        <td style={td}>{STATUS_BADGE[moa.status] ?? STATUS_BADGE['draft']}</td>
                        <td style={{ ...td, color: '#475569', fontSize: '0.78rem' }}>{fmtDate(moa.deleted_at)}</td>
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

          {/* ── Audit Logs tab ──────────────────────────────────────────── */}
          {tab === 'audit' && (
            <div style={card}>
              <CardHeader title="Audit Trail" sub="Every INSERT, UPDATE, DELETE, and RESTORE is logged with user ID and timestamp." />
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <TableHeader cols={[{ label: 'Action' }, { label: 'Table' }, { label: 'User ID' }, { label: 'Details' }, { label: 'Timestamp' }]} />
                  <tbody>
                    {auditLogs.length === 0 ? (
                      <tr><td colSpan={5} style={{ ...td, textAlign: 'center', color: '#475569', padding: '3rem' }}>No audit logs yet.</td></tr>
                    ) : auditLogs.map(log => {
                      const ac = ACTION_COLORS[log.action] ?? { bg: '#1e293b', color: '#94a3b8', border: '#334155' };
                      return (
                        <tr key={log.id} style={{ borderBottom: '1px solid rgba(30,41,59,0.5)' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(255,255,255,0.01)'; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'; }}
                        >
                          <td style={td}>
                            <span style={{ padding: '0.2rem 0.55rem', borderRadius: '0.375rem', background: ac.bg, color: ac.color, border: `1px solid ${ac.border}`, fontSize: '0.72rem', fontWeight: 700, fontFamily: 'monospace' }}>
                              {log.action}
                            </span>
                          </td>
                          <td style={{ ...td, color: '#64748b', fontSize: '0.78rem', fontFamily: 'monospace' }}>{log.target_table}</td>
                          <td style={{ ...td, color: '#475569', fontSize: '0.72rem', fontFamily: 'monospace' }}>
                            <span title={log.user_id}>{log.user_id?.slice(0, 8)}…</span>
                          </td>
                          <td style={{ ...td, color: '#475569', fontSize: '0.75rem', maxWidth: '280px' }}>
                            <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {log.details ? JSON.stringify(log.details) : '—'}
                            </span>
                          </td>
                          <td style={{ ...td, color: '#475569', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                            {fmtDateTime(log.created_at)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── User Management tab ─────────────────────────────────────── */}
          {tab === 'users' && (
            <div style={card}>
              <CardHeader title="User Management" sub={`${profiles.length} registered users`}>
                {searchInput}
              </CardHeader>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <TableHeader cols={[{ label: 'User' }, { label: 'Role' }, { label: 'College / Office' }, { label: 'Joined' }, { label: 'Status', right: false }]} />
                  <tbody>
                    {filteredUsers.map(p => (
                      <tr key={p.id} style={{ borderBottom: '1px solid rgba(30,41,59,0.5)', opacity: p.is_blocked ? 0.5 : 1 }}
                        onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(255,255,255,0.015)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'; }}
                      >
                        <td style={td}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{ width: '2rem', height: '2rem', borderRadius: '50%', background: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', flexShrink: 0 }}>
                              {(p.first_name?.[0] || p.email?.[0] || '?').toUpperCase()}
                            </div>
                            <div>
                              <div style={{ color: '#f1f5f9', fontWeight: 600, fontSize: '0.85rem' }}>{p.first_name && p.last_name ? `${p.first_name} ${p.last_name}` : '—'}</div>
                              <div style={{ color: '#475569', fontSize: '0.72rem' }}>{p.email}</div>
                            </div>
                          </div>
                        </td>
                        <td style={td}>
                          <select value={p.role} onChange={e => updateRole(p.id, e.target.value as Role)} disabled={p.email === user?.email}
                            style={{ background: '#0a0f1e', border: '1px solid #1e293b', color: '#e2e8f0', borderRadius: '0.4rem', padding: '0.28rem 0.55rem', fontSize: '0.78rem', fontFamily: 'inherit', cursor: 'pointer', outline: 'none' }}>
                            <option value="student">Student</option>
                            <option value="staff">Staff / Maintainer</option>
                            <option value="admin">Admin</option>
                          </select>
                        </td>
                        <td style={{ ...td, color: '#64748b', fontSize: '0.8rem' }}>{p.college_office || '—'}</td>
                        <td style={{ ...td, color: '#475569', fontSize: '0.75rem' }}>{fmtDate(p.created_at)}</td>
                        <td style={td}>
                          <button onClick={() => toggleBlock(p.id, p.is_blocked)} disabled={p.email === user?.email}
                            style={{ padding: '0.28rem 0.75rem', borderRadius: '0.4rem', border: '1px solid', borderColor: p.is_blocked ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.25)', background: p.is_blocked ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.08)', color: p.is_blocked ? '#f87171' : '#34d399', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', cursor: 'pointer', fontFamily: 'inherit', opacity: p.email === user?.email ? 0.3 : 1 }}>
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