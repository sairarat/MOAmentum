import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { UserAuth } from '../context/AuthContext';
import { logAudit } from './auditLogger';
import MoaForm from './MoaForm';

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

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';
const fmtDateTime = (d: string) =>
  new Date(d).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

const STATUS_MAP: Record<string, { label: string; color: string; bg: string; border: string }> = {
  approved: { label: 'Approved', color: '#34d399', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.25)' },
  pending:  { label: 'Pending',  color: '#fbbf24', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.25)' },
  draft:    { label: 'Draft',    color: '#60a5fa', bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.25)' },
  expired:  { label: 'Expired',  color: '#9ca3af', bg: 'rgba(156,163,175,0.1)', border: 'rgba(156,163,175,0.22)' },
  rejected: { label: 'Rejected', color: '#f87171', bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.25)'  },
  inactive: { label: 'Inactive', color: '#c084fc', bg: 'rgba(192,132,252,0.12)',border: 'rgba(192,132,252,0.25)'},
};

const ACTION_COLORS: Record<string, string> = {
  INSERT: '#34d399', UPDATE: '#60a5fa', DELETE: '#f87171', RESTORE: '#fbbf24',
};

const StatusBadge = ({ status }: { status: string }) => {
  const s = STATUS_MAP[status] ?? STATUS_MAP['draft'];
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.22rem 0.65rem', borderRadius: '20px', background: s.bg, color: s.color, border: `1px solid ${s.border}`, fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
      <span style={{ width: '0.38rem', height: '0.38rem', borderRadius: '50%', background: s.color, flexShrink: 0 }} />
      {s.label}
    </span>
  );
};

// ─── History Modal ────────────────────────────────────────────────────────────

const HistoryModal = ({ moa, onClose }: { moa: Moa; onClose: () => void }) => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('audit_logs').select('*').contains('details', { id: moa.id })
      .order('created_at', { ascending: false })
      .then(({ data }) => { if (data) setLogs(data as AuditLog[]); setLoading(false); });
  }, [moa.id]);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(3,7,18,0.88)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: '16px', width: '100%', maxWidth: '640px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 32px 80px rgba(0,0,0,0.7)' }}>
        <div style={{ padding: '1.1rem 1.5rem', borderBottom: '1px solid #1f2937', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#f9fafb' }}>Audit History</div>
            <div style={{ color: '#6b7280', fontSize: '0.775rem', marginTop: '0.2rem' }}>{moa.partner_name}{moa.hteid ? ` · ${moa.hteid}` : ''}</div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: '1px solid #1f2937', borderRadius: '6px', color: '#6b7280', padding: '0.3rem 0.6rem', cursor: 'pointer', fontSize: '0.9rem', lineHeight: 1, fontFamily: 'inherit' }}>✕</button>
        </div>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#4b5563' }}>Loading history…</div>
          ) : logs.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#4b5563' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📭</div>
              No audit history for this MOA yet.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #1f2937' }}>
                  {['Action','User','Details','When'].map(h => (
                    <th key={h} style={{ padding: '0.6rem 1rem', textAlign: 'left', fontSize: '0.65rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log.id} style={{ borderBottom: '1px solid rgba(31,41,55,0.5)' }}>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span style={{ fontFamily: 'monospace', fontSize: '0.72rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: '4px', background: `${ACTION_COLORS[log.action] ?? '#9ca3af'}18`, color: ACTION_COLORS[log.action] ?? '#9ca3af', border: `1px solid ${ACTION_COLORS[log.action] ?? '#9ca3af'}30` }}>{log.action}</span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', fontSize: '0.75rem', color: '#6b7280' }}>
                      <span title={log.user_id}>{log.user_id?.slice(0, 8)}…</span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#6b7280', fontSize: '0.78rem', maxWidth: '220px' }}>
                      <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.details ? JSON.stringify(log.details) : '—'}</span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#6b7280', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>{fmtDateTime(log.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Sidebar ──────────────────────────────────────────────────────────────────

interface SidebarProps {
  open: boolean;
  tab: Tab;
  onTab: (t: Tab) => void;
  onClose: () => void;
  onSignOut: () => void;
  moaCount: number;
  trashCount: number;
  userCount: number;
}

const NAV_ITEMS: { id: Tab; label: string; desc: string; icon: React.ReactNode }[] = [
  {
    id: 'moas', label: 'MOA Records', desc: 'Manage all agreements',
    icon: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  },
  {
    id: 'trash', label: 'Trash', desc: 'Soft deleted records',
    icon: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>,
  },
  {
    id: 'audit', label: 'Audit Trail', desc: 'System activity log',
    icon: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>,
  },
  {
    id: 'users', label: 'User Management', desc: 'Manage roles & access',
    icon: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  },
];

const Sidebar = ({ open, tab, onTab, onClose, onSignOut, moaCount, trashCount, userCount }: SidebarProps) => {
  const counts: Partial<Record<Tab, number>> = { moas: moaCount, trash: trashCount, users: userCount };

  return (
    <>
      {/* Backdrop — mobile */}
      {open && (
        <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 39, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)' }} />
      )}

      {/* Sidebar panel */}
      <aside style={{
        position: 'fixed', left: 0, top: 0, bottom: 0, zIndex: 40,
        width: open ? '260px' : '0px',
        background: '#0d1424',
        borderRight: open ? '1px solid #1f2937' : 'none',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
        transition: 'width 0.25s cubic-bezier(0.4,0,0.2,1)',
        boxShadow: open ? '4px 0 32px rgba(0,0,0,0.4)' : 'none',
      }}>
        <div style={{ width: '260px', display: 'flex', flexDirection: 'column', height: '100%' }}>

          {/* Header — logo + close */}
          <div style={{ padding: '1.25rem 1.25rem 1rem', borderBottom: '1px solid #1f2937', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem' }}>
              <div>
                {/* Text logo */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                  <div style={{ width: '1.75rem', height: '1.75rem', background: 'linear-gradient(135deg, #d97706, #b45309)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                  </div>
                  <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#f9fafb', letterSpacing: '-0.02em', lineHeight: 1 }}>
                    MOAmentum
                  </span>
                </div>
                {/* Description */}
                <p style={{ margin: 0, fontSize: '0.72rem', color: '#4b5563', lineHeight: 1.5, paddingLeft: '2.25rem' }}>
                  NEU MOA Management System
                </p>
              </div>
              {/* Close button */}
              <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid #1f2937', borderRadius: '6px', color: '#6b7280', width: '1.75rem', height: '1.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, transition: 'background 0.15s, color 0.15s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.08)'; (e.currentTarget as HTMLButtonElement).style.color = '#f9fafb'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)'; (e.currentTarget as HTMLButtonElement).style.color = '#6b7280'; }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          </div>

          {/* Role badge */}
          <div style={{ padding: '0.875rem 1.25rem 0.5rem', flexShrink: 0 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.3rem 0.7rem', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '20px' }}>
              <span style={{ width: '0.35rem', height: '0.35rem', borderRadius: '50%', background: '#fbbf24' }} />
              <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Administrator</span>
            </div>
          </div>

          {/* Nav section label */}
          <div style={{ padding: '0.5rem 1.25rem 0.375rem', flexShrink: 0 }}>
            <span style={{ fontSize: '0.62rem', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Navigation</span>
          </div>

          {/* Nav items */}
          <nav style={{ flex: 1, overflowY: 'auto', padding: '0 0.625rem' }}>
            {NAV_ITEMS.map(item => {
              const isActive = tab === item.id;
              const count = counts[item.id];
              return (
                <button key={item.id} onClick={() => { onTab(item.id); onClose(); }}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem',
                    padding: '0.65rem 0.75rem', marginBottom: '0.15rem',
                    borderRadius: '10px', border: 'none', cursor: 'pointer', textAlign: 'left',
                    background: isActive ? 'rgba(245,158,11,0.1)' : 'transparent',
                    color: isActive ? '#fbbf24' : '#6b7280',
                    fontFamily: 'inherit',
                    transition: 'background 0.15s, color 0.15s',
                  }}
                  onMouseEnter={e => { if (!isActive) { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)'; (e.currentTarget as HTMLButtonElement).style.color = '#d1d5db'; } }}
                  onMouseLeave={e => { if (!isActive) { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = '#6b7280'; } }}>
                  {/* Icon */}
                  <span style={{ flexShrink: 0, opacity: isActive ? 1 : 0.7 }}>{item.icon}</span>
                  {/* Text */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: isActive ? 700 : 500, fontSize: '0.875rem', lineHeight: 1.2 }}>{item.label}</div>
                    <div style={{ fontSize: '0.68rem', color: isActive ? 'rgba(251,191,36,0.6)' : '#4b5563', marginTop: '0.15rem' }}>{item.desc}</div>
                  </div>
                  {/* Count badge */}
                  {count !== undefined && count > 0 && (
                    <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '0.1rem 0.45rem', borderRadius: '20px', background: isActive ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.06)', color: isActive ? '#fbbf24' : '#6b7280', flexShrink: 0 }}>
                      {count}
                    </span>
                  )}
                  {/* Active indicator */}
                  {isActive && <div style={{ width: '3px', height: '1.5rem', background: '#fbbf24', borderRadius: '2px', flexShrink: 0 }} />}
                </button>
              );
            })}
          </nav>

          {/* Footer — sign out */}
          <div style={{ padding: '0.875rem 0.625rem 1.25rem', borderTop: '1px solid #1f2937', flexShrink: 0 }}>
            <button onClick={onSignOut}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.65rem 0.75rem', borderRadius: '10px', border: 'none', cursor: 'pointer', background: 'transparent', color: '#6b7280', fontFamily: 'inherit', transition: 'background 0.15s, color 0.15s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.08)'; (e.currentTarget as HTMLButtonElement).style.color = '#f87171'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = '#6b7280'; }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.875rem', lineHeight: 1.2 }}>Sign Out</div>
                <div style={{ fontSize: '0.68rem', color: '#374151', marginTop: '0.1rem' }}>End your session</div>
              </div>
            </button>
          </div>

        </div>
      </aside>
    </>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const AdminDashboard = () => {
  const { user, signOutUser } = UserAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('moas');
  const [moas, setMoas] = useState<Moa[]>([]);
  const [trash, setTrash] = useState<Moa[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [collegeFilter, setCollegeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Moa | null>(null);
  const [historyMoa, setHistoryMoa] = useState<Moa | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchMoas     = useCallback(async () => { const { data } = await supabase.from('moas').select('*').is('deleted_at', null).order('created_at', { ascending: false }); if (data) setMoas(data as Moa[]); }, []);
  const fetchTrash    = useCallback(async () => { const { data } = await supabase.from('moas').select('*').not('deleted_at', 'is', null).order('deleted_at', { ascending: false }); if (data) setTrash(data as Moa[]); }, []);
  const fetchProfiles = useCallback(async () => { const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false }); if (data) setProfiles(data as Profile[]); }, []);
  const fetchAudit    = useCallback(async () => { const { data } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(150); if (data) setAuditLogs(data as AuditLog[]); }, []);
  const refreshAll    = useCallback(() => Promise.all([fetchMoas(), fetchTrash(), fetchProfiles(), fetchAudit()]), [fetchMoas, fetchTrash, fetchProfiles, fetchAudit]);

  useEffect(() => { setLoading(true); refreshAll().finally(() => setLoading(false)); }, [refreshAll]);

  // Close sidebar on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setSidebarOpen(false); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleDelete = async (moa: Moa) => {
    if (!confirm(`Move "${moa.partner_name}" to trash?`)) return;
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
    if (!confirm(`Permanently delete "${moa.partner_name}"? This cannot be undone.`)) return;
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

  const colleges = Array.from(new Set(moas.map(m => m.college_office).filter(Boolean))).sort();
  const hasFilters = collegeFilter !== 'all' || statusFilter !== 'all' || dateFrom || dateTo;
  const clearFilters = () => { setCollegeFilter('all'); setStatusFilter('all'); setDateFrom(''); setDateTo(''); };

  const filteredMoas = moas.filter(m => {
    const q = search.toLowerCase();
    const ms = !q || [m.partner_name, m.hteid, m.title, m.college_office, m.contact_person, m.contact_email, m.contact_phone, m.address, m.notes].some(f => f?.toLowerCase().includes(q));
    const mc = collegeFilter === 'all' || m.college_office === collegeFilter;
    const mst = statusFilter === 'all' || m.status === statusFilter;
    const eff = m.effective_date ? new Date(m.effective_date) : null;
    const mf = !dateFrom || (eff && eff >= new Date(dateFrom));
    const mt = !dateTo   || (eff && eff <= new Date(dateTo + 'T23:59:59'));
    return ms && mc && mst && mf && mt;
  });

  const filteredUsers = profiles.filter(p => {
    const q = search.toLowerCase();
    return !q || [p.email, p.first_name, p.last_name, p.college_office].some(f => f?.toLowerCase().includes(q));
  });

  const now = new Date();
  const stats = [
    { label: 'Active MOAs',   value: moas.filter(m => m.status === 'approved').length,                                                          icon: '✅', color: '#34d399', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.18)', sub: 'Approved' },
    { label: 'Under Process', value: moas.filter(m => ['pending','draft'].includes(m.status)).length,                                            icon: '⏳', color: '#fbbf24', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.18)', sub: 'Pending + Draft' },
    { label: 'Expired',       value: moas.filter(m => m.status === 'expired' || (m.expiry_date && new Date(m.expiry_date) < now)).length,        icon: '📅', color: '#9ca3af', bg: 'rgba(156,163,175,0.08)',border: 'rgba(156,163,175,0.18)',sub: 'Past expiry' },
    { label: 'Rejected',      value: moas.filter(m => m.status === 'rejected').length,                                                          icon: '🚫', color: '#f87171', bg: 'rgba(239,68,68,0.08)',  border: 'rgba(239,68,68,0.18)',  sub: 'Rejected' },
    { label: 'In Trash',      value: trash.length,                                                                                              icon: '🗑',  color: '#c084fc', bg: 'rgba(192,132,252,0.08)',border: 'rgba(192,132,252,0.18)',sub: 'Soft-deleted' },
    { label: 'Total Users',   value: profiles.length,                                                                                           icon: '👥', color: '#818cf8', bg: 'rgba(99,102,241,0.08)', border: 'rgba(99,102,241,0.18)', sub: 'Registered' },
  ];

  const currentTab = NAV_ITEMS.find(n => n.id === tab);

  // Shared styles
  const th: React.CSSProperties = { padding: '0.7rem 1.5rem', textAlign: 'left', fontSize: '0.65rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em', background: 'rgba(255,255,255,0.018)', whiteSpace: 'nowrap' };
  const td: React.CSSProperties = { padding: '0.95rem 1.5rem', borderBottom: '1px solid rgba(31,41,55,0.6)', fontSize: '0.875rem', color: '#d1d5db', verticalAlign: 'middle' };
  const inputSt: React.CSSProperties = { padding: '0.45rem 0.75rem', background: '#0d1424', border: '1px solid #1f2937', borderRadius: '8px', color: '#f9fafb', fontSize: '0.8rem', outline: 'none', fontFamily: 'inherit', transition: 'border-color 0.15s' };

  const Btn = ({ onClick, variant = 'default', children }: { onClick: () => void; variant?: 'default' | 'danger' | 'ghost' | 'success'; children: React.ReactNode }) => {
    const styles: Record<string, React.CSSProperties> = {
      default: { border: '1px solid #1f2937', background: 'transparent', color: '#9ca3af' },
      danger:  { border: '1px solid rgba(239,68,68,0.2)',  background: 'rgba(239,68,68,0.06)',  color: '#f87171' },
      ghost:   { border: '1px solid rgba(99,102,241,0.2)', background: 'rgba(99,102,241,0.06)', color: '#818cf8' },
      success: { border: '1px solid rgba(16,185,129,0.2)', background: 'rgba(16,185,129,0.06)', color: '#34d399' },
    };
    return (
      <button onClick={onClick} style={{ ...styles[variant], padding: '0.28rem 0.65rem', fontSize: '0.75rem', fontWeight: 600, borderRadius: '6px', cursor: 'pointer', fontFamily: 'inherit', marginLeft: '0.35rem', transition: 'all 0.15s' }}>
        {children}
      </button>
    );
  };

  return (
    <div style={{ minHeight: '100vh', background: '#030712', color: '#f9fafb', fontFamily: "'DM Sans', system-ui, sans-serif" }}>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: '1.25rem', right: '1.25rem', zIndex: 300, padding: '0.75rem 1rem', borderRadius: '12px', background: toast.type === 'success' ? '#064e3b' : '#7f1d1d', color: toast.type === 'success' ? '#6ee7b7' : '#fca5a5', border: `1px solid ${toast.type === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`, fontWeight: 600, fontSize: '0.875rem', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', gap: '0.6rem', animation: 'slideDown 0.2s ease' }}>
          <span>{toast.type === 'success' ? '✓' : '✕'}</span>
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

      {/* History Modal */}
      {historyMoa && <HistoryModal moa={historyMoa} onClose={() => setHistoryMoa(null)} />}

      {/* Sidebar */}
      <Sidebar
        open={sidebarOpen}
        tab={tab}
        onTab={t => { setTab(t); setSearch(''); }}
        onClose={() => setSidebarOpen(false)}
        onSignOut={signOutUser}
        moaCount={moas.length}
        trashCount={trash.length}
        userCount={profiles.length}
      />

      {/* Main */}
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

        {/* ── Topbar ── */}
        <header style={{ position: 'sticky', top: 0, zIndex: 30, background: 'rgba(3,7,18,0.92)', backdropFilter: 'blur(14px)', borderBottom: '1px solid #1f2937', padding: '0 2rem', height: '60px', display: 'flex', alignItems: 'center', gap: '1rem' }}>

          {/* Hamburger button */}
          <button onClick={() => setSidebarOpen(o => !o)}
            style={{ width: '36px', height: '36px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '5px', background: 'rgba(255,255,255,0.04)', border: '1px solid #1f2937', borderRadius: '8px', cursor: 'pointer', flexShrink: 0, padding: 0, transition: 'background 0.15s' }}
            title="Toggle navigation"
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.08)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)'; }}>
            <span style={{ width: '16px', height: '2px', background: '#9ca3af', borderRadius: '1px', transition: 'all 0.2s', transform: sidebarOpen ? 'translateY(7px) rotate(45deg)' : 'none' }} />
            <span style={{ width: '16px', height: '2px', background: '#9ca3af', borderRadius: '1px', transition: 'all 0.2s', opacity: sidebarOpen ? 0 : 1 }} />
            <span style={{ width: '16px', height: '2px', background: '#9ca3af', borderRadius: '1px', transition: 'all 0.2s', transform: sidebarOpen ? 'translateY(-7px) rotate(-45deg)' : 'none' }} />
          </button>

          {/* Page title */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#f9fafb', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                {currentTab?.label ?? 'Dashboard'}
              </div>
              <div style={{ fontSize: '0.68rem', color: '#4b5563', marginTop: '0.1rem' }}>{user?.email}</div>
            </div>
          </div>

          {/* Right side */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ padding: '0.25rem 0.7rem', background: 'rgba(245,158,11,0.1)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '20px', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Administrator
            </span>
          </div>
        </header>

        <main style={{ padding: '1.75rem 2rem', flex: 1 }}>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: '0.875rem', marginBottom: '1.75rem' }}>
            {stats.map(s => (
              <div key={s.label} style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: '12px', padding: '1rem 1.1rem', cursor: 'default', transition: 'transform 0.15s, box-shadow 0.15s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 16px rgba(0,0,0,0.4)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'none'; (e.currentTarget as HTMLDivElement).style.boxShadow = 'none'; }}>
                <div style={{ fontSize: '1.4rem', marginBottom: '0.5rem' }}>{s.icon}</div>
                <div style={{ fontSize: '1.75rem', fontWeight: 900, color: s.color, lineHeight: 1, letterSpacing: '-0.03em' }}>{loading ? '—' : s.value}</div>
                <div style={{ fontSize: '0.62rem', color: '#4b5563', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: '0.3rem' }}>{s.label}</div>
                <div style={{ fontSize: '0.6rem', color: '#374151', marginTop: '0.1rem' }}>{s.sub}</div>
              </div>
            ))}
          </div>

          {/* Filter bar */}
          {(tab === 'moas' || tab === 'audit' || tab === 'users') && (
            <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: '12px', padding: '0.875rem 1.25rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: '200px', maxWidth: '300px' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#4b5563" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input
                  placeholder={tab === 'audit' ? 'Filter logs…' : tab === 'users' ? 'Search users…' : 'Search MOAs…'}
                  value={search} onChange={e => setSearch(e.target.value)}
                  style={{ ...inputSt, width: '100%', paddingLeft: '2.25rem', boxSizing: 'border-box' }}
                  onFocus={e => { e.target.style.borderColor = '#10b981'; }}
                  onBlur={e => { e.target.style.borderColor = '#1f2937'; }}
                />
              </div>

              {tab === 'moas' && (
                <>
                  <div style={{ width: '1px', height: '1.5rem', background: '#1f2937', flexShrink: 0 }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.65rem', fontWeight: 600, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.07em', whiteSpace: 'nowrap' }}>College</span>
                    <select value={collegeFilter} onChange={e => setCollegeFilter(e.target.value)} style={inputSt}>
                      <option value="all">All</option>
                      {colleges.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.65rem', fontWeight: 600, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Status</span>
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={inputSt}>
                      <option value="all">All Statuses</option>
                      {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.65rem', fontWeight: 600, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.07em', whiteSpace: 'nowrap' }}>From</span>
                    <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={inputSt} onFocus={e => { e.target.style.borderColor = '#10b981'; }} onBlur={e => { e.target.style.borderColor = '#1f2937'; }} />
                    <span style={{ fontSize: '0.65rem', fontWeight: 600, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.07em' }}>To</span>
                    <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={inputSt} onFocus={e => { e.target.style.borderColor = '#10b981'; }} onBlur={e => { e.target.style.borderColor = '#1f2937'; }} />
                  </div>
                  {hasFilters && (
                    <button onClick={clearFilters} style={{ padding: '0.45rem 0.875rem', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', color: '#f87171', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                      ✕ Clear filters
                    </button>
                  )}
                  <button onClick={() => { setEditTarget(null); setShowForm(true); }}
                    style={{ marginLeft: 'auto', padding: '0.55rem 1.1rem', background: '#10b981', border: 'none', borderRadius: '8px', color: 'white', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', boxShadow: '0 2px 10px rgba(16,185,129,0.3)', transition: 'background 0.15s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#059669'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#10b981'; }}>
                    + New MOA
                  </button>
                </>
              )}
            </div>
          )}

          {/* ── MOA Records ── */}
          {tab === 'moas' && (
            <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: '14px', overflow: 'hidden' }}>
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #1f2937', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Records</span>
                  {hasFilters && <span style={{ fontSize: '0.62rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: '20px', background: 'rgba(245,158,11,0.1)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.2)' }}>Filtered</span>}
                </div>
                <span style={{ fontSize: '0.78rem', color: '#4b5563' }}>{filteredMoas.length} record{filteredMoas.length !== 1 ? 's' : ''}</span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr>
                    {['HTEID','Partner / Company','College','Contact','Effective','Status','Actions'].map(h => (
                      <th key={h} style={{ ...th, textAlign: h === 'Actions' ? 'right' : 'left' }}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={7} style={{ ...td, textAlign: 'center', padding: '3.5rem', color: '#4b5563' }}>
                        <div style={{ width: '1.75rem', height: '1.75rem', border: '2px solid #1f2937', borderTopColor: '#10b981', borderRadius: '50%', animation: 'spin 0.75s linear infinite', margin: '0 auto 0.75rem' }} />
                        Loading…
                      </td></tr>
                    ) : filteredMoas.length === 0 ? (
                      <tr><td colSpan={7} style={{ ...td, textAlign: 'center', padding: '3.5rem', color: '#4b5563' }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🔍</div>
                        {search || hasFilters ? 'No records match the current filters.' : 'No MOAs yet — click "+ New MOA" to get started.'}
                      </td></tr>
                    ) : filteredMoas.map(moa => (
                      <tr key={moa.id}
                        onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(255,255,255,0.02)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'; }}>
                        <td style={{ ...td, fontFamily: 'monospace', fontSize: '0.78rem', color: '#6b7280' }}>{moa.hteid || '—'}</td>
                        <td style={td}>
                          <div style={{ fontWeight: 600, color: '#f9fafb' }}>{moa.partner_name}</div>
                          {moa.title && <div style={{ fontSize: '0.78rem', color: '#6b7280', marginTop: '0.15rem' }}>{moa.title}</div>}
                          {moa.address && <div style={{ fontSize: '0.72rem', color: '#374151', marginTop: '0.1rem' }}>{moa.address}</div>}
                        </td>
                        <td style={{ ...td, color: '#9ca3af', fontSize: '0.82rem' }}>{moa.college_office || '—'}</td>
                        <td style={{ ...td, fontSize: '0.82rem' }}>
                          {moa.contact_person && <div style={{ color: '#f9fafb', fontWeight: 500 }}>{moa.contact_person}</div>}
                          {moa.contact_email  && <div style={{ color: '#6b7280', fontSize: '0.75rem' }}>{moa.contact_email}</div>}
                        </td>
                        <td style={{ ...td, color: '#9ca3af', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>{fmtDate(moa.effective_date)}</td>
                        <td style={td}><StatusBadge status={moa.status} /></td>
                        <td style={{ ...td, textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <Btn onClick={() => setHistoryMoa(moa)} variant="ghost">History</Btn>
                          <Btn onClick={() => { setEditTarget(moa); setShowForm(true); }}>Edit</Btn>
                          <Btn onClick={() => handleDelete(moa)} variant="danger">Delete</Btn>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Trash ── */}
          {tab === 'trash' && (
            <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: '14px', overflow: 'hidden' }}>
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #1f2937' }}>
                <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Soft Deleted Records</div>
                <div style={{ color: '#4b5563', fontSize: '0.78rem', marginTop: '0.25rem' }}>Only admins can view and recover deleted entries.</div>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr>
                    {['HTEID','Partner / Company','Status','Deleted On','Actions'].map(h => (
                      <th key={h} style={{ ...th, textAlign: h === 'Actions' ? 'right' : 'left' }}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {trash.length === 0 ? (
                      <tr><td colSpan={5} style={{ ...td, textAlign: 'center', padding: '3.5rem', color: '#4b5563' }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>✨</div>
                        Trash is empty.
                      </td></tr>
                    ) : trash.map(moa => (
                      <tr key={moa.id} style={{ opacity: 0.7 }}
                        onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(255,255,255,0.015)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'; }}>
                        <td style={{ ...td, fontFamily: 'monospace', fontSize: '0.78rem', color: '#6b7280' }}>{moa.hteid || '—'}</td>
                        <td style={td}>
                          <div style={{ fontWeight: 600 }}>{moa.partner_name}</div>
                          {moa.title && <div style={{ fontSize: '0.78rem', color: '#4b5563', marginTop: '0.1rem' }}>{moa.title}</div>}
                        </td>
                        <td style={td}><StatusBadge status={moa.status} /></td>
                        <td style={{ ...td, color: '#9ca3af', fontSize: '0.82rem' }}>{fmtDate(moa.deleted_at)}</td>
                        <td style={{ ...td, textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <Btn onClick={() => handleRestore(moa)} variant="success">↩ Recover</Btn>
                          <Btn onClick={() => handlePermDelete(moa)} variant="danger">Delete Forever</Btn>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Audit Trail ── */}
          {tab === 'audit' && (
            <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: '14px', overflow: 'hidden' }}>
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #1f2937' }}>
                <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.1em' }}>System Activity Log</div>
                <div style={{ color: '#4b5563', fontSize: '0.78rem', marginTop: '0.25rem' }}>Every INSERT, UPDATE, DELETE, and RESTORE — last 150 entries</div>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr>
                    {['Action','Table','User ID','Details','Timestamp'].map(h => (
                      <th key={h} style={th}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {auditLogs
                      .filter(l => !search || l.action?.toLowerCase().includes(search.toLowerCase()) || l.target_table?.toLowerCase().includes(search.toLowerCase()))
                      .map(log => (
                        <tr key={log.id}
                          onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(255,255,255,0.015)'; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'; }}>
                          <td style={td}>
                            <span style={{ fontFamily: 'monospace', fontSize: '0.72rem', fontWeight: 700, padding: '0.22rem 0.55rem', borderRadius: '4px', background: `${ACTION_COLORS[log.action] ?? '#9ca3af'}18`, color: ACTION_COLORS[log.action] ?? '#9ca3af', border: `1px solid ${ACTION_COLORS[log.action] ?? '#9ca3af'}30` }}>{log.action}</span>
                          </td>
                          <td style={{ ...td, fontFamily: 'monospace', fontSize: '0.78rem', color: '#6b7280' }}>{log.target_table}</td>
                          <td style={{ ...td, fontFamily: 'monospace', fontSize: '0.75rem', color: '#4b5563' }}>
                            <span title={log.user_id}>{log.user_id?.slice(0, 8)}…</span>
                          </td>
                          <td style={{ ...td, color: '#6b7280', fontSize: '0.78rem', maxWidth: '280px' }}>
                            <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.details ? JSON.stringify(log.details) : '—'}</span>
                          </td>
                          <td style={{ ...td, color: '#4b5563', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>{fmtDateTime(log.created_at)}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Users ── */}
          {tab === 'users' && (
            <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: '14px', overflow: 'hidden' }}>
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #1f2937', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Registered Users</span>
                <span style={{ fontSize: '0.78rem', color: '#4b5563' }}>{profiles.length} user{profiles.length !== 1 ? 's' : ''}</span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr>
                    {['User','Role','College / Office','Joined','Status'].map(h => (
                      <th key={h} style={th}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {filteredUsers.map(p => (
                      <tr key={p.id} style={{ opacity: p.is_blocked ? 0.5 : 1 }}
                        onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(255,255,255,0.02)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'; }}>
                        <td style={td}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{ width: '2rem', height: '2rem', borderRadius: '50%', background: '#1f2937', border: '1px solid #374151', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, color: '#9ca3af', flexShrink: 0 }}>
                              {(p.first_name?.[0] || p.email?.[0] || '?').toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#f9fafb' }}>{p.first_name && p.last_name ? `${p.first_name} ${p.last_name}` : '—'}</div>
                              <div style={{ fontSize: '0.75rem', color: '#4b5563' }}>{p.email}</div>
                            </div>
                          </div>
                        </td>
                        <td style={td}>
                          <select value={p.role} onChange={e => updateRole(p.id, e.target.value as Role)} disabled={p.email === user?.email}
                            style={{ background: '#0d1424', border: '1px solid #1f2937', color: '#f9fafb', borderRadius: '6px', padding: '0.28rem 0.55rem', fontSize: '0.78rem', fontFamily: 'inherit', cursor: 'pointer', outline: 'none' }}>
                            <option value="student">Student</option>
                            <option value="staff">Staff / Maintainer</option>
                            <option value="admin">Admin</option>
                          </select>
                        </td>
                        <td style={{ ...td, color: '#9ca3af', fontSize: '0.82rem' }}>{p.college_office || '—'}</td>
                        <td style={{ ...td, color: '#4b5563', fontSize: '0.82rem' }}>{fmtDate(p.created_at)}</td>
                        <td style={td}>
                          <button onClick={() => toggleBlock(p.id, p.is_blocked)} disabled={p.email === user?.email}
                            style={{ padding: '0.28rem 0.75rem', borderRadius: '6px', border: '1px solid', borderColor: p.is_blocked ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.25)', background: p.is_blocked ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.06)', color: p.is_blocked ? '#f87171' : '#34d399', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer', fontFamily: 'inherit', opacity: p.email === user?.email ? 0.3 : 1, transition: 'all 0.15s' }}>
                            {p.is_blocked ? 'Unblock' : 'Active'}
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