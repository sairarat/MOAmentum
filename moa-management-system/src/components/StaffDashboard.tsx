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
interface Profile { first_name: string; last_name: string; college_office: string; role: string; }

const STATUS_MAP: Record<string, { label: string; color: string; bg: string; border: string }> = {
  approved: { label: 'Approved', color: '#34d399', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.25)' },
  pending:  { label: 'Pending',  color: '#fbbf24', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.25)' },
  draft:    { label: 'Draft',    color: '#60a5fa', bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.25)' },
  expired:  { label: 'Expired',  color: '#9ca3af', bg: 'rgba(156,163,175,0.1)', border: 'rgba(156,163,175,0.22)' },
  rejected: { label: 'Rejected', color: '#f87171', bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.25)'  },
  inactive: { label: 'Inactive', color: '#c084fc', bg: 'rgba(192,132,252,0.12)',border: 'rgba(192,132,252,0.25)'},
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

const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

// ─── Sidebar ──────────────────────────────────────────────────────────────────

const StaffSidebar = ({ open, onClose, onSignOut, firstName, college }: { open: boolean; onClose: () => void; onSignOut: () => void; firstName: string; college: string; }) => (
  <>
    {open && <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 39, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)' }} />}

    <aside style={{ position: 'fixed', left: 0, top: 0, bottom: 0, zIndex: 40, width: open ? '260px' : '0px', background: '#0d1424', borderRight: open ? '1px solid #1f2937' : 'none', display: 'flex', flexDirection: 'column', overflow: 'hidden', transition: 'width 0.25s cubic-bezier(0.4,0,0.2,1)', boxShadow: open ? '4px 0 32px rgba(0,0,0,0.4)' : 'none' }}>
      <div style={{ width: '260px', display: 'flex', flexDirection: 'column', height: '100%' }}>

        {/* Header */}
        <div style={{ padding: '1.25rem 1.25rem 1rem', borderBottom: '1px solid #1f2937', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                <div style={{ width: '1.75rem', height: '1.75rem', background: 'linear-gradient(135deg, #7c3aed, #5b21b6)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                  </svg>
                </div>
                <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#f9fafb', letterSpacing: '-0.02em', lineHeight: 1 }}>MOAmentum</span>
              </div>
              <p style={{ margin: 0, fontSize: '0.72rem', color: '#4b5563', lineHeight: 1.5, paddingLeft: '2.25rem' }}>
                NEU MOA Management System
              </p>
            </div>
            <button onClick={onClose}
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid #1f2937', borderRadius: '6px', color: '#6b7280', width: '1.75rem', height: '1.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.08)'; (e.currentTarget as HTMLButtonElement).style.color = '#f9fafb'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)'; (e.currentTarget as HTMLButtonElement).style.color = '#6b7280'; }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        </div>

        {/* Role + user info */}
        <div style={{ padding: '0.875rem 1.25rem 0.5rem', flexShrink: 0 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.3rem 0.7rem', background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: '20px', marginBottom: '0.75rem' }}>
            <span style={{ width: '0.35rem', height: '0.35rem', borderRadius: '50%', background: '#a78bfa' }} />
            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Staff / Maintainer</span>
          </div>
          {firstName && (
            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#d1d5db' }}>Welcome, {firstName}</div>
          )}
          {college && (
            <div style={{ fontSize: '0.72rem', color: '#4b5563', marginTop: '0.2rem' }}>📍 {college}</div>
          )}
        </div>

        {/* Nav label */}
        <div style={{ padding: '0.5rem 1.25rem 0.375rem', flexShrink: 0 }}>
          <span style={{ fontSize: '0.62rem', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Navigation</span>
        </div>

        {/* Nav item — single section for staff */}
        <nav style={{ padding: '0 0.625rem', flex: 1 }}>
          <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.65rem 0.75rem', borderRadius: '10px', background: 'rgba(124,58,237,0.1)', color: '#a78bfa' }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.875rem', lineHeight: 1.2 }}>MOA Records</div>
              <div style={{ fontSize: '0.68rem', color: 'rgba(167,139,250,0.6)', marginTop: '0.15rem' }}>Manage agreements</div>
            </div>
            <div style={{ width: '3px', height: '1.5rem', background: '#7c3aed', borderRadius: '2px', marginLeft: 'auto', flexShrink: 0 }} />
          </div>

          {/* Info notice */}
          <div style={{ margin: '0.75rem 0.125rem 0', padding: '0.75rem', background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.15)', borderRadius: '10px' }}>
            <div style={{ fontSize: '0.72rem', color: '#7c3aed', fontWeight: 600, marginBottom: '0.3rem' }}>Staff Access</div>
            <div style={{ fontSize: '0.68rem', color: '#4b5563', lineHeight: 1.6 }}>
              All active MOAs, all statuses. Deleted records and audit trail are Admin-only.
            </div>
          </div>
        </nav>

        {/* Footer */}
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

// ─── Main ─────────────────────────────────────────────────────────────────────

const StaffDashboard = () => {
  const { user, signOutUser } = UserAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [moas, setMoas] = useState<Moa[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [collegeFilter, setCollegeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Moa | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [roleChangeBanner, setRoleChangeBanner] = useState('');
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchMoas = useCallback(async () => {
    const { data } = await supabase.from('moas')
      .select('id, hteid, title, partner_name, address, contact_person, contact_email, contact_phone, effective_date, expiry_date, status, college_office, notes, created_at')
      .is('deleted_at', null).order('created_at', { ascending: false });
    if (data) setMoas(data as Moa[]);
  }, []);

  useEffect(() => {
    if (!user) return;
    supabase.from('profiles').select('first_name, last_name, college_office, role').eq('id', user.id).single()
      .then(({ data }) => { if (data) setProfile(data as Profile); });
    setLoading(true);
    fetchMoas().finally(() => setLoading(false));

    channelRef.current = supabase.channel(`staff-role-${user.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` }, (payload) => {
        const nr = payload.new?.role;
        if (nr === 'student') { setRoleChangeBanner('Your role has been changed to Student. Redirecting…'); setTimeout(() => { navigate('/dashboard', { replace: true }); window.location.reload(); }, 2800); }
        if (nr === 'admin')   { setRoleChangeBanner("Promoted to Admin! Redirecting…"); setTimeout(() => navigate('/admin-dashboard', { replace: true }), 2800); }
      }).subscribe();

    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setSidebarOpen(false); };
    window.addEventListener('keydown', handler);
    return () => { channelRef.current?.unsubscribe(); window.removeEventListener('keydown', handler); };
  }, [user, navigate, fetchMoas]);

  const handleDelete = async (moa: Moa) => {
    if (!confirm(`Move "${moa.partner_name}" to trash?`)) return;
    await supabase.from('moas').update({ deleted_at: new Date().toISOString() }).eq('id', moa.id);
    await logAudit(user!.id, 'DELETE', 'moas', { id: moa.id, partner: moa.partner_name });
    showToast(`"${moa.partner_name}" removed.`);
    fetchMoas();
  };

  const colleges = Array.from(new Set(moas.map(m => m.college_office).filter(Boolean))).sort();
  const hasFilters = collegeFilter !== 'all' || statusFilter !== 'all' || dateFrom || dateTo;
  const clearFilters = () => { setCollegeFilter('all'); setStatusFilter('all'); setDateFrom(''); setDateTo(''); };

  const filtered = moas.filter(m => {
    const q = search.toLowerCase();
    const ms = !q || [m.partner_name, m.hteid, m.title, m.college_office, m.contact_person, m.contact_email, m.contact_phone, m.address, m.notes].some(f => f?.toLowerCase().includes(q));
    const mc = collegeFilter === 'all' || m.college_office === collegeFilter;
    const mst = statusFilter === 'all' || m.status === statusFilter;
    const eff = m.effective_date ? new Date(m.effective_date) : null;
    const mf = !dateFrom || (eff && eff >= new Date(dateFrom));
    const mt = !dateTo   || (eff && eff <= new Date(dateTo + 'T23:59:59'));
    return ms && mc && mst && mf && mt;
  });

  const now = new Date();
  const stats = [
    { label: 'Active',        value: moas.filter(m => m.status === 'approved').length,                                                         icon: '✅', color: '#34d399', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.18)' },
    { label: 'Under Process', value: moas.filter(m => ['pending','draft'].includes(m.status)).length,                                          icon: '⏳', color: '#fbbf24', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.18)' },
    { label: 'Expired',       value: moas.filter(m => m.status === 'expired' || (m.expiry_date && new Date(m.expiry_date) < now)).length,      icon: '📅', color: '#9ca3af', bg: 'rgba(156,163,175,0.08)',border: 'rgba(156,163,175,0.18)' },
    { label: 'Rejected',      value: moas.filter(m => m.status === 'rejected').length,                                                        icon: '🚫', color: '#f87171', bg: 'rgba(239,68,68,0.08)',  border: 'rgba(239,68,68,0.18)'  },
  ];

  const th: React.CSSProperties = { padding: '0.7rem 1.5rem', textAlign: 'left', fontSize: '0.65rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em', background: 'rgba(255,255,255,0.018)', whiteSpace: 'nowrap' };
  const td: React.CSSProperties = { padding: '0.95rem 1.5rem', borderBottom: '1px solid rgba(31,41,55,0.6)', fontSize: '0.875rem', color: '#d1d5db', verticalAlign: 'middle' };
  const inputSt: React.CSSProperties = { padding: '0.45rem 0.75rem', background: '#0d1424', border: '1px solid #1f2937', borderRadius: '8px', color: '#f9fafb', fontSize: '0.8rem', outline: 'none', fontFamily: 'inherit', transition: 'border-color 0.15s' };

  return (
    <div style={{ minHeight: '100vh', background: '#030712', color: '#f9fafb', fontFamily: "'DM Sans', system-ui, sans-serif" }}>

      {/* Role change banner */}
      {roleChangeBanner && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200, background: 'linear-gradient(90deg, #1d4ed8, #2563eb)', color: 'white', padding: '0.875rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', fontSize: '0.9rem', fontWeight: 600, boxShadow: '0 4px 20px rgba(37,99,235,0.4)' }}>
          🔄 {roleChangeBanner}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: '1.25rem', right: '1.25rem', zIndex: 300, padding: '0.75rem 1rem', borderRadius: '12px', background: toast.type === 'success' ? '#064e3b' : '#7f1d1d', color: toast.type === 'success' ? '#6ee7b7' : '#fca5a5', border: `1px solid ${toast.type === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`, fontWeight: 600, fontSize: '0.875rem', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span>{toast.type === 'success' ? '✓' : '✕'}</span>{toast.msg}
        </div>
      )}

      {/* MOA Form */}
      {showForm && (
        <MoaForm
          initial={editTarget ? { ...editTarget, id: editTarget.id, expiry_date: editTarget.expiry_date ?? undefined } : undefined}
          onSuccess={() => { setShowForm(false); setEditTarget(null); fetchMoas(); showToast(editTarget ? 'MOA updated.' : 'MOA created.'); }}
          onCancel={() => { setShowForm(false); setEditTarget(null); }}
        />
      )}

      {/* Sidebar */}
      <StaffSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onSignOut={signOutUser}
        firstName={profile?.first_name || ''}
        college={profile?.college_office || ''}
      />

      {/* Main */}
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

        {/* Topbar */}
        <header style={{ position: 'sticky', top: 0, zIndex: 30, background: 'rgba(3,7,18,0.92)', backdropFilter: 'blur(14px)', borderBottom: '1px solid #1f2937', padding: '0 2rem', height: '60px', display: 'flex', alignItems: 'center', gap: '1rem' }}>

          {/* Hamburger */}
          <button onClick={() => setSidebarOpen(o => !o)}
            style={{ width: '36px', height: '36px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '5px', background: 'rgba(255,255,255,0.04)', border: '1px solid #1f2937', borderRadius: '8px', cursor: 'pointer', flexShrink: 0, padding: 0, transition: 'background 0.15s' }}
            title="Toggle navigation"
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.08)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)'; }}>
            <span style={{ width: '16px', height: '2px', background: '#9ca3af', borderRadius: '1px', transition: 'all 0.2s', transform: sidebarOpen ? 'translateY(7px) rotate(45deg)' : 'none' }} />
            <span style={{ width: '16px', height: '2px', background: '#9ca3af', borderRadius: '1px', transition: 'all 0.2s', opacity: sidebarOpen ? 0 : 1 }} />
            <span style={{ width: '16px', height: '2px', background: '#9ca3af', borderRadius: '1px', transition: 'all 0.2s', transform: sidebarOpen ? 'translateY(-7px) rotate(-45deg)' : 'none' }} />
          </button>

          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#f9fafb', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
              Welcome, {profile?.first_name || 'Staff'} 👋
            </div>
            <div style={{ fontSize: '0.68rem', color: '#4b5563', marginTop: '0.1rem' }}>{user?.email}</div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {profile?.college_office && <span style={{ fontSize: '0.78rem', color: '#4b5563' }}>{profile.college_office}</span>}
            <span style={{ padding: '0.25rem 0.7rem', background: 'rgba(124,58,237,0.1)', color: '#a78bfa', border: '1px solid rgba(124,58,237,0.2)', borderRadius: '20px', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Staff
            </span>
          </div>
        </header>

        <main style={{ padding: '1.75rem 2rem', flex: 1 }}>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '0.875rem', marginBottom: '1.75rem' }}>
            {stats.map(s => (
              <div key={s.label} style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: '12px', padding: '1rem 1.1rem', transition: 'transform 0.15s, box-shadow 0.15s', cursor: 'default' }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 16px rgba(0,0,0,0.4)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'none'; (e.currentTarget as HTMLDivElement).style.boxShadow = 'none'; }}>
                <div style={{ fontSize: '1.4rem', marginBottom: '0.5rem' }}>{s.icon}</div>
                <div style={{ fontSize: '1.75rem', fontWeight: 900, color: s.color, lineHeight: 1, letterSpacing: '-0.03em' }}>{loading ? '—' : s.value}</div>
                <div style={{ fontSize: '0.62rem', color: '#4b5563', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: '0.3rem' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Filter bar */}
          <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: '12px', padding: '0.875rem 1.25rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '200px', maxWidth: '300px' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#4b5563" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input placeholder="Search company, HTEID, contact…" value={search} onChange={e => setSearch(e.target.value)}
                style={{ ...inputSt, width: '100%', paddingLeft: '2.25rem', boxSizing: 'border-box' }}
                onFocus={e => { e.target.style.borderColor = '#7c3aed'; }}
                onBlur={e => { e.target.style.borderColor = '#1f2937'; }} />
            </div>
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
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={inputSt} onFocus={e => { e.target.style.borderColor = '#7c3aed'; }} onBlur={e => { e.target.style.borderColor = '#1f2937'; }} />
              <span style={{ fontSize: '0.65rem', fontWeight: 600, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.07em' }}>To</span>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={inputSt} onFocus={e => { e.target.style.borderColor = '#7c3aed'; }} onBlur={e => { e.target.style.borderColor = '#1f2937'; }} />
            </div>
            {hasFilters && (
              <button onClick={clearFilters} style={{ padding: '0.45rem 0.875rem', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', color: '#f87171', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                ✕ Clear
              </button>
            )}
            <button onClick={() => { setEditTarget(null); setShowForm(true); }}
              style={{ marginLeft: 'auto', padding: '0.55rem 1.1rem', background: '#7c3aed', border: 'none', borderRadius: '8px', color: 'white', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', boxShadow: '0 2px 10px rgba(124,58,237,0.3)', transition: 'background 0.15s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#6d28d9'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#7c3aed'; }}>
              + New MOA
            </button>
          </div>

          {/* MOA Table */}
          <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: '14px', overflow: 'hidden' }}>
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #1f2937', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.1em' }}>MOA Records</span>
                {hasFilters && <span style={{ fontSize: '0.62rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: '20px', background: 'rgba(124,58,237,0.1)', color: '#a78bfa', border: '1px solid rgba(124,58,237,0.2)' }}>Filtered</span>}
              </div>
              <span style={{ fontSize: '0.78rem', color: '#4b5563' }}>{filtered.length} record{filtered.length !== 1 ? 's' : ''}</span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr>
                  {['HTEID','Partner / Company','Address','Contact','Effective','Status','Actions'].map(h => (
                    <th key={h} style={{ ...th, textAlign: h === 'Actions' ? 'right' : 'left' }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={7} style={{ ...td, textAlign: 'center', padding: '3.5rem', color: '#4b5563' }}>
                      <div style={{ width: '1.75rem', height: '1.75rem', border: '2px solid #1f2937', borderTopColor: '#7c3aed', borderRadius: '50%', animation: 'spin 0.75s linear infinite', margin: '0 auto 0.75rem' }} />
                      Loading…
                    </td></tr>
                  ) : filtered.length === 0 ? (
                    <tr><td colSpan={7} style={{ ...td, textAlign: 'center', padding: '3.5rem', color: '#4b5563' }}>
                      <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🔍</div>
                      {search || hasFilters ? 'No records match the current filters.' : 'No MOAs yet — click "+ New MOA" to add one.'}
                    </td></tr>
                  ) : filtered.map(moa => (
                    <tr key={moa.id}
                      onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(255,255,255,0.02)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'; }}>
                      <td style={{ ...td, fontFamily: 'monospace', fontSize: '0.78rem', color: '#6b7280' }}>{moa.hteid || '—'}</td>
                      <td style={td}>
                        <div style={{ fontWeight: 600, color: '#f9fafb' }}>{moa.partner_name}</div>
                        {moa.title && <div style={{ fontSize: '0.78rem', color: '#6b7280', marginTop: '0.15rem' }}>{moa.title}</div>}
                      </td>
                      <td style={{ ...td, fontSize: '0.82rem', maxWidth: '160px' }}>
                        <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#9ca3af' }}>{moa.address || '—'}</span>
                      </td>
                      <td style={{ ...td, fontSize: '0.82rem' }}>
                        {moa.contact_person && <div style={{ color: '#f9fafb', fontWeight: 500 }}>{moa.contact_person}</div>}
                        {moa.contact_email  && <div style={{ color: '#6b7280', fontSize: '0.75rem' }}>{moa.contact_email}</div>}
                        {moa.contact_phone  && <div style={{ color: '#4b5563', fontSize: '0.75rem' }}>{moa.contact_phone}</div>}
                        {!moa.contact_person && !moa.contact_email && !moa.contact_phone && <span style={{ color: '#374151' }}>—</span>}
                      </td>
                      <td style={{ ...td, color: '#9ca3af', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>{fmtDate(moa.effective_date)}</td>
                      <td style={td}><StatusBadge status={moa.status} /></td>
                      <td style={{ ...td, textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button onClick={() => { setEditTarget(moa); setShowForm(true); }}
                          style={{ padding: '0.28rem 0.65rem', fontSize: '0.75rem', fontWeight: 600, border: '1px solid #1f2937', background: 'transparent', color: '#9ca3af', borderRadius: '6px', cursor: 'pointer', fontFamily: 'inherit', marginLeft: '0.35rem', transition: 'all 0.15s' }}>
                          Edit
                        </button>
                        <button onClick={() => handleDelete(moa)}
                          style={{ padding: '0.28rem 0.65rem', fontSize: '0.75rem', fontWeight: 600, border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.06)', color: '#f87171', borderRadius: '6px', cursor: 'pointer', fontFamily: 'inherit', marginLeft: '0.35rem', transition: 'all 0.15s' }}>
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