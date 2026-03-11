import { supabase } from '../supabaseClient';

/**
 * Inserts a row into audit_logs for every INSERT / UPDATE / DELETE action.
 * Called manually after every Supabase mutation so we have full control
 * over what gets logged, without needing database triggers.
 *
 * @param userId     - auth.uid() of the acting user
 * @param action     - 'INSERT' | 'UPDATE' | 'DELETE' | 'RESTORE'
 * @param targetTable - name of the table being mutated
 * @param details    - arbitrary JSONB payload (ids, changed fields, etc.)
 */
export const logAudit = async (
  userId: string,
  action: 'INSERT' | 'UPDATE' | 'DELETE' | 'RESTORE',
  targetTable: string,
  details: Record<string, unknown> = {}
): Promise<void> => {
  const { error } = await supabase.from('audit_logs').insert({
    user_id: userId,
    action,
    target_table: targetTable,
    details,
  });

  if (error) {
    // Audit failures are non-blocking — log to console but don't throw
    console.warn('[auditLogger] Failed to write audit log:', error.message);
  }
};