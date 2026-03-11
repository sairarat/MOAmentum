import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { UserAuth } from '../context/AuthContext';

type Role = 'student' | 'staff' | 'admin';
type Tab = 'users' | 'audit';

interface Profile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: Role;
  college_office: string;
  is_blocked: boolean;
  created_at: string;
}

interface AuditLog {
  id: string;
  action: string;
  target_table: string;
  details: any;
  created_at: string;
}

const AdminDashboard = () => {
  const { user, signOutUser } = UserAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [tab, setTab] = useState<Tab>('users');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchProfiles = async () => {
    setLoading(true);
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (data) setProfiles(data as Profile[]);
    setLoading(false);
  };

  const fetchAuditLogs = async () => {
    const { data } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(50);
    if (data) setAuditLogs(data as AuditLog[]);
  };

  useEffect(() => { fetchProfiles(); fetchAuditLogs(); }, []);

  const updateRole = async (id: string, role: Role) => {
    const { error } = await supabase.from('profiles').update({ role }).eq('id', id);
    if (error) { showToast('Failed to update role.', 'error'); return; }
    showToast('Role updated.');
    fetchProfiles();
  };

  const toggleBlock = async (id: string, current: boolean) => {
    const { error } = await supabase.from('profiles').update({ is_blocked: !current }).eq('id', id);
    if (error) { showToast('Failed to update status.', 'error'); return; }
    showToast(current ? 'User unblocked.' : 'User blocked.');
    fetchProfiles();
  };

  const filtered = profiles.filter(p =>
    p.email?.toLowerCase().includes(search.toLowerCase()) ||
    p.first_name?.toLowerCase().includes(search.toLowerCase()) ||
    p.last_name?.toLowerCase().includes(search.toLowerCase())
  );

  const stats = [
    { label: 'Total Users',      value: profiles.length,                               icon: '👥', accent: '#334155' },
    { label: 'Staff/Maintainers',value: profiles.filter(p => p.role === 'staff').length, icon: '🛠',  accent: 'rgba(139,92,246,0.25)' },
    { label: 'Admins',           value: profiles.filter(p => p.role === 'admin').length, icon: '⬡',  accent: 'rgba(245,158,11,0.25)' },
    { label: 'Blocked',          value: profiles.filter(p => p.is_blocked).length,       icon: '🚫', accent: 'rgba(239,68,68,0.2)' },
  ];

  const NavIcon = ({ id, title, children }: { id: Tab; title: string; children: React.ReactNode }) => (
    <button
      title={title}
      onClick={() => setTab(id)}
      className={`sidebar-icon-btn ${tab === id ? 'active' : ''}`}
      style={tab === id ? { background: 'rgba(245,158,11,0.15)', color: '#fbbf24' } : {}}
    >
      {children}
    </button>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#020817', color: '#e2e8f0', display: 'flex' }}>
      {/* Toast */}
      {toast && (
        <div className={`neu-toast ${toast.type}`}>{toast.msg}</div>
      )}

      {/* ── Sidebar ── */}
      <div className="neu-sidebar">
        <div style={{
          width: '2.25rem', height: '2.25rem', background: '#d97706',
          borderRadius: '0.625rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
        </div>

        <div style={{ flex: 1 }} />

        <NavIcon id="users" title="User Management">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
        </NavIcon>

        <NavIcon id="audit" title="Audit Logs">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
          </svg>
        </NavIcon>

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
            <div style={{ fontWeight: 700, fontSize: '1rem', color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ color: '#fbbf24' }}>⬡</span> Admin Dashboard
            </div>
            <div style={{ fontSize: '0.75rem', color: '#475569', marginTop: '0.125rem' }}>{user?.email}</div>
          </div>
          <span className="badge badge-amber">Administrator</span>
        </header>

        <main style={{ padding: '2rem', flex: 1 }}>
          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
            {stats.map(s => (
              <div key={s.label} style={{
                background: '#0f172a', border: `1px solid ${s.accent}`,
                borderRadius: '1rem', padding: '1.25rem 1.5rem'
              }}>
                <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{s.icon}</div>
                <div style={{ fontSize: '2rem', fontWeight: 900, color: '#f1f5f9', lineHeight: 1 }}>
                  {loading ? '—' : s.value}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: '0.4rem' }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>

          {/* Tab switcher */}
          <div style={{
            display: 'flex', gap: '0.25rem', background: '#0f172a',
            border: '1px solid #1e293b', borderRadius: '0.75rem',
            padding: '0.25rem', width: 'fit-content', marginBottom: '1.5rem'
          }}>
            {(['users', 'audit'] as Tab[]).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  padding: '0.5rem 1.25rem',
                  borderRadius: '0.5rem',
                  border: 'none',
                  fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
                  transition: 'all 0.15s',
                  background: tab === t ? '#1e293b' : 'transparent',
                  color: tab === t ? '#f1f5f9' : '#475569',
                  fontFamily: 'inherit'
                }}
              >
                {t === 'users' ? '👥 Users' : '📋 Audit Logs'}
              </button>
            ))}
          </div>

          {/* ── Users tab ── */}
          {tab === 'users' && (
            <div className="neu-card">
              <div style={{
                padding: '1rem 1.5rem', borderBottom: '1px solid #1e293b',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem'
              }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', flexShrink: 0 }}>
                  User Management
                </span>
                <input
                  placeholder="Search by name or email…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="neu-input"
                  style={{ maxWidth: '260px', padding: '0.5rem 0.875rem', fontSize: '0.8rem' }}
                />
              </div>

              {loading ? (
                <div style={{ padding: '3rem', textAlign: 'center' }}>
                  <div className="spinner" style={{ margin: '0 auto' }} />
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="neu-table">
                    <thead>
                      <tr>
                        <th>User</th>
                        <th>Role</th>
                        <th>College / Office</th>
                        <th>Joined</th>
                        <th style={{ textAlign: 'center' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map(p => (
                        <tr key={p.id} style={{ opacity: p.is_blocked ? 0.55 : 1 }}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              <div style={{
                                width: '2rem', height: '2rem', borderRadius: '50%',
                                background: '#1e293b', display: 'flex', alignItems: 'center',
                                justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700,
                                color: '#94a3b8', flexShrink: 0
                              }}>
                                {(p.first_name?.[0] || p.email?.[0] || '?').toUpperCase()}
                              </div>
                              <div>
                                <div style={{ color: '#f1f5f9', fontWeight: 600, fontSize: '0.875rem' }}>
                                  {p.first_name && p.last_name ? `${p.first_name} ${p.last_name}` : '—'}
                                </div>
                                <div style={{ color: '#475569', fontSize: '0.75rem' }}>{p.email}</div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <select
                              value={p.role}
                              onChange={e => updateRole(p.id, e.target.value as Role)}
                              disabled={p.email === user?.email}
                            >
                              <option value="student">Student</option>
                              <option value="staff">Staff / Maintainer</option>
                              <option value="admin">Admin</option>
                            </select>
                          </td>
                          <td style={{ color: '#64748b', fontSize: '0.8rem' }}>{p.college_office || '—'}</td>
                          <td style={{ color: '#475569', fontSize: '0.75rem' }}>
                            {new Date(p.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <button
                              onClick={() => toggleBlock(p.id, p.is_blocked)}
                              disabled={p.email === user?.email}
                              style={{
                                padding: '0.3rem 0.875rem',
                                borderRadius: '0.5rem',
                                border: `1px solid ${p.is_blocked ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.25)'}`,
                                background: p.is_blocked ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.08)',
                                color: p.is_blocked ? '#f87171' : '#34d399',
                                fontSize: '0.7rem', fontWeight: 700,
                                textTransform: 'uppercase', letterSpacing: '0.06em',
                                cursor: 'pointer',
                                fontFamily: 'inherit',
                                transition: 'all 0.15s',
                                opacity: p.email === user?.email ? 0.3 : 1,
                              }}
                            >
                              {p.is_blocked ? 'Blocked' : 'Active'}
                            </button>
                          </td>
                        </tr>
                      ))}
                      {filtered.length === 0 && (
                        <tr>
                          <td colSpan={5} style={{ textAlign: 'center', color: '#475569', padding: '2.5rem' }}>
                            No users match your search.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── Audit tab ── */}
          {tab === 'audit' && (
            <div className="neu-card">
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #1e293b' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Audit Logs
                </span>
                <div style={{ color: '#475569', fontSize: '0.75rem', marginTop: '0.2rem' }}>Last 50 recorded actions</div>
              </div>
              {auditLogs.length === 0 ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: '#475569', fontSize: '0.875rem' }}>
                  No audit logs found.
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="neu-table">
                    <thead>
                      <tr>
                        <th>Action</th>
                        <th>Table</th>
                        <th>Details</th>
                        <th>Timestamp</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditLogs.map(log => (
                        <tr key={log.id}>
                          <td>
                            <span style={{
                              display: 'inline-block', padding: '0.2rem 0.6rem',
                              background: '#1e293b', border: '1px solid #334155',
                              borderRadius: '0.4rem', fontFamily: 'monospace',
                              fontSize: '0.75rem', color: '#94a3b8'
                            }}>
                              {log.action}
                            </span>
                          </td>
                          <td style={{ color: '#64748b', fontSize: '0.775rem', fontFamily: 'monospace' }}>
                            {log.target_table}
                          </td>
                          <td style={{ color: '#475569', fontSize: '0.75rem', maxWidth: '280px' }}>
                            <span style={{
                              display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                            }}>
                              {log.details ? JSON.stringify(log.details) : '—'}
                            </span>
                          </td>
                          <td style={{ color: '#475569', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                            {new Date(log.created_at).toLocaleString('en-US', {
                              month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                            })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;