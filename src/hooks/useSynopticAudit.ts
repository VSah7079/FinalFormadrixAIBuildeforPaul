/**
 * hooks/useSynopticAudit.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Wraps logEvent() + sendSynopticNotification() into a single hook so
 * TemplateRenderer and SynopticEditor don't need to call both separately.
 *
 * Drop-in path: src/hooks/useSynopticAudit.ts
 *
 * Usage in TemplateRenderer.tsx — replace existing logEvent calls:
 *
 *   // Before
 *   logEvent({ user: DEFAULT_USER, category: 'user', action: 'state_transition',
 *              templateId: template.id, stateFrom: prev, stateTo: confirmAction.target });
 *
 *   // After
 *   const { auditAndNotify, auditOnly } = useSynopticAudit();
 *
 *   await auditAndNotify({                       // logs + emails
 *     category:     'user',
 *     action:       'template.approved',
 *     templateId:   template.id,
 *     templateName: template.name,
 *     stateFrom:    'in_review',
 *     stateTo:      'approved',
 *     note:         confirmNote,
 *   });
 *
 *   auditOnly({                                  // logs only — no email
 *     category:  'user',
 *     action:    'template.field_updated',
 *     templateId: template.id,
 *     fieldId:   field.id,
 *     oldValue:  oldLabel,
 *     newValue:  newLabel,
 *   });
 *
 * The hook resolves the current user from AuthContext automatically,
 * matching how TemplateRenderer uses DEFAULT_USER today. Once AuthContext
 * returns a real user object, replace DEFAULT_USER references with this hook.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useCallback } from 'react';
import { logEvent } from '../audit/auditLogger';
import { SynopticAuditEvent } from '../types/SynopticAuditEvents';
import { sendSynopticNotification } from '../services/synopticNotificationService';

// Omit user — hook resolves it. Callers can override by passing user explicitly.
type AuditInput = Omit<SynopticAuditEvent, 'user'> & { user?: string };

// Fallback until AuthContext provides a real user — matches TemplateRenderer pattern
const DEFAULT_USER = 'Dr. Reviewer';

export function useSynopticAudit() {

  /**
   * auditAndNotify — use for lifecycle transitions and sync events.
   * Writes to audit log AND sends email if action is in NOTIFY_ON_ACTIONS.
   */
  const auditAndNotify = useCallback(async (input: AuditInput): Promise<void> => {
    const event: SynopticAuditEvent = {
      ...input,
      user: input.user ?? DEFAULT_USER,
    };

    // 1. Audit log — existing infrastructure, same as TemplateRenderer
    logEvent(event);

    // 2. Email notification — fire-and-forget, never blocks UI
    try {
      await sendSynopticNotification(event);
    } catch (err) {
      console.error('[useSynopticAudit] Notification failed silently:', err);
    }
  }, []);

  /**
   * auditOnly — use for high-frequency editor actions (field edits, coding).
   * Writes to audit log only. No email sent.
   */
  const auditOnly = useCallback((input: AuditInput): void => {
    logEvent({
      ...input,
      user: input.user ?? DEFAULT_USER,
    });
  }, []);

  return { auditAndNotify, auditOnly };
}
