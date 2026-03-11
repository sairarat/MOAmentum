import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { UserAuth } from '../context/AuthContext';
import { logAudit } from './auditLogger';

export interface MoaFormData {
  hteid: string;
  title: string;
  partner_name: string;
  address: string;
  contact_person: string;
  contact_email: string;
  contact_phone: string;
  effective_date: string;
  expiry_date: string;
  status: 'draft' | 'pending' | 'approved' | 'expired' | 'rejected';
  college_office: string;
  notes: string;
}

const EMPTY: MoaFormData = {
  hteid: '', title: '', partner_name: '', address: '',
  contact_person: '', contact_email: '', contact_phone: '',
  effective_date: '', expiry_date: '',
  status: 'draft', college_office: '', notes: '',
};

interface Props {
  initial?: Partial<MoaFormData> & { id?: string };
  onSuccess: () => void;
  onCancel: () => void;
}

const FIELD_STYLE: React.CSSProperties = {
  width: '100%', padding: '0.65rem 0.875rem',
  background: '#0a0f1e', border: '1px solid #1e293b',
  borderRadius: '0.625rem', color: '#e2e8f0',
  fontSize: '0.85rem', outline: 'none',
  fontFamily: 'inherit', transition: 'border-color 0.2s',
  boxSizing: 'border-box',
};

const LABEL_STYLE: React.CSSProperties = {
  display: 'block', fontSize: '0.7rem', fontWeight: 700,
  color: '#64748b', textTransform: 'uppercase',
  letterSpacing: '0.08em', marginBottom: '0.4rem',
};

const SECTION_STYLE: React.CSSProperties = {
  marginBottom: '1.75rem',
};

const SECTION_TITLE: React.CSSProperties = {
  fontSize: '0.7rem', fontWeight: 800, color: '#475569',
  textTransform: 'uppercase', letterSpacing: '0.12em',
  marginBottom: '1rem', paddingBottom: '0.5rem',
  borderBottom: '1px solid #1e293b',
};

const GRID2: React.CSSProperties = {
  display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem',
};

export const MoaForm = ({ initial, onSuccess, onCancel }: Props) => {
  const { user } = UserAuth();
  const isEdit = !!initial?.id;
  const [form, setForm] = useState<MoaFormData>({ ...EMPTY, ...initial });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (field: keyof MoaFormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(prev => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.hteid.trim()) { setError('HTEID is required.'); return; }
    if (!form.partner_name.trim()) { setError('Company / Partner name is required.'); return; }
    if (!form.effective_date) { setError('Effective date is required.'); return; }

    setLoading(true);

    if (isEdit) {
      const { error: err } = await supabase.from('moas').update({
        hteid: form.hteid,
        title: form.title,
        partner_name: form.partner_name,
        address: form.address,
        contact_person: form.contact_person,
        contact_email: form.contact_email,
        contact_phone: form.contact_phone,
        effective_date: form.effective_date,
        expiry_date: form.expiry_date || null,
        status: form.status,
        college_office: form.college_office,
        notes: form.notes,
      }).eq('id', initial!.id!);

      if (err) { setError(err.message); setLoading(false); return; }
      await logAudit(user!.id, 'UPDATE', 'moas', { id: initial!.id, status: form.status, partner: form.partner_name });
    } else {
      const { data, error: err } = await supabase.from('moas').insert({
        hteid: form.hteid,
        title: form.title,
        partner_name: form.partner_name,
        address: form.address,
        contact_person: form.contact_person,
        contact_email: form.contact_email,
        contact_phone: form.contact_phone,
        effective_date: form.effective_date,
        expiry_date: form.expiry_date || null,
        status: form.status,
        college_office: form.college_office,
        notes: form.notes,
        created_by: user!.id,
      }).select().single();

      if (err) { setError(err.message); setLoading(false); return; }
      await logAudit(user!.id, 'INSERT', 'moas', { id: data?.id, partner: form.partner_name });
    }

    setLoading(false);
    onSuccess();
  };

  const inputProps = (field: keyof MoaFormData, extra?: object) => ({
    value: form[field] as string,
    onChange: set(field),
    style: FIELD_STYLE,
    onFocus: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      e.target.style.borderColor = '#10b981';
    },
    onBlur: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      e.target.style.borderColor = '#1e293b';
    },
    ...extra,
  });

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      background: 'rgba(2,8,23,0.85)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1.5rem',
    }}>
      <div style={{
        background: '#0f172a', border: '1px solid #1e293b',
        borderRadius: '1.25rem', width: '100%', maxWidth: '680px',
        maxHeight: '90vh', overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
      }}>
        {/* Header */}
        <div style={{
          padding: '1.25rem 1.75rem',
          borderBottom: '1px solid #1e293b',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div>
            <h2 style={{ color: '#f1f5f9', fontWeight: 800, fontSize: '1.05rem', margin: 0 }}>
              {isEdit ? 'Edit MOA Entry' : 'New MOA Entry'}
            </h2>
            <p style={{ color: '#475569', fontSize: '0.775rem', margin: '0.2rem 0 0' }}>
              {isEdit ? 'Update memorandum of agreement details' : 'Create a new memorandum of agreement record'}
            </p>
          </div>
          <button onClick={onCancel} style={{
            background: 'transparent', border: '1px solid #1e293b',
            borderRadius: '0.5rem', color: '#64748b',
            padding: '0.4rem 0.6rem', cursor: 'pointer', lineHeight: 1,
          }}>✕</button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} style={{ overflowY: 'auto', padding: '1.5rem 1.75rem', flex: 1 }}>
          {error && (
            <div style={{
              marginBottom: '1.25rem', padding: '0.75rem 1rem',
              background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
              borderRadius: '0.625rem', color: '#f87171', fontSize: '0.8rem',
            }}>{error}</div>
          )}

          {/* Identification */}
          <div style={SECTION_STYLE}>
            <div style={SECTION_TITLE}>Identification</div>
            <div style={GRID2}>
              <div>
                <label style={LABEL_STYLE}>HTEID <span style={{ color: '#f87171' }}>*</span></label>
                <input placeholder="e.g. HTE-2024-001" required {...inputProps('hteid')} />
              </div>
              <div>
                <label style={LABEL_STYLE}>Status</label>
                <select {...inputProps('status')}>
                  <option value="draft">Draft</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="expired">Expired</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>
            <div style={{ marginTop: '0.875rem' }}>
              <label style={LABEL_STYLE}>MOA Title</label>
              <input placeholder="Memorandum of Agreement with…" {...inputProps('title')} />
            </div>
          </div>

          {/* Partner Info */}
          <div style={SECTION_STYLE}>
            <div style={SECTION_TITLE}>Partner / Company</div>
            <div>
              <label style={LABEL_STYLE}>Company / Partner Name <span style={{ color: '#f87171' }}>*</span></label>
              <input placeholder="Full legal name of the partner institution" required {...inputProps('partner_name')} />
            </div>
            <div style={{ marginTop: '0.875rem' }}>
              <label style={LABEL_STYLE}>Address</label>
              <input placeholder="Complete address" {...inputProps('address')} />
            </div>
            <div style={{ ...GRID2, marginTop: '0.875rem' }}>
              <div>
                <label style={LABEL_STYLE}>College / Office</label>
                <input placeholder="e.g. College of Engineering" {...inputProps('college_office')} />
              </div>
              <div>
                <label style={LABEL_STYLE}>Contact Person</label>
                <input placeholder="Full name" {...inputProps('contact_person')} />
              </div>
            </div>
            <div style={{ ...GRID2, marginTop: '0.875rem' }}>
              <div>
                <label style={LABEL_STYLE}>Contact Email</label>
                <input type="email" placeholder="contact@company.com" {...inputProps('contact_email')} />
              </div>
              <div>
                <label style={LABEL_STYLE}>Contact Phone</label>
                <input placeholder="+63 9XX XXX XXXX" {...inputProps('contact_phone')} />
              </div>
            </div>
          </div>

          {/* Dates */}
          <div style={SECTION_STYLE}>
            <div style={SECTION_TITLE}>Timeline</div>
            <div style={GRID2}>
              <div>
                <label style={LABEL_STYLE}>Effective Date <span style={{ color: '#f87171' }}>*</span></label>
                <input type="date" required {...inputProps('effective_date')} />
              </div>
              <div>
                <label style={LABEL_STYLE}>Expiry Date</label>
                <input type="date" {...inputProps('expiry_date')} />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div style={SECTION_STYLE}>
            <div style={SECTION_TITLE}>Additional Notes</div>
            <textarea
              placeholder="Any additional remarks or notes…"
              rows={3}
              value={form.notes}
              onChange={set('notes')}
              style={{ ...FIELD_STYLE, resize: 'vertical', minHeight: '80px' }}
              onFocus={e => { e.target.style.borderColor = '#10b981'; }}
              onBlur={e => { e.target.style.borderColor = '#1e293b'; }}
            />
          </div>
        </form>

        {/* Footer */}
        <div style={{
          padding: '1rem 1.75rem',
          borderTop: '1px solid #1e293b',
          display: 'flex', justifyContent: 'flex-end', gap: '0.75rem',
          flexShrink: 0,
        }}>
          <button type="button" onClick={onCancel} style={{
            padding: '0.6rem 1.25rem', background: 'transparent',
            border: '1px solid #1e293b', borderRadius: '0.625rem',
            color: '#94a3b8', fontSize: '0.875rem', fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit',
          }}>
            Cancel
          </button>
          <button
            onClick={handleSubmit as any}
            disabled={loading}
            style={{
              padding: '0.6rem 1.5rem', background: loading ? '#065f46' : '#059669',
              border: 'none', borderRadius: '0.625rem',
              color: 'white', fontSize: '0.875rem', fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
              opacity: loading ? 0.7 : 1, transition: 'background 0.2s',
            }}
          >
            {loading ? 'Saving…' : isEdit ? 'Save Changes' : 'Create MOA'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MoaForm;