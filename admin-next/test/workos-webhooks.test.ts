import { describe, expect, it } from 'vitest';
import { eventToAuditEntry, type WorkOSEvent } from '../src/lib/workos-webhooks';

describe('eventToAuditEntry', () => {
  it('maps_known_event_types_to_namespaced_action', () => {
    const entry = eventToAuditEntry({
      id: 'evt_001',
      event: 'authentication.password_failed',
      data: { email: 'attacker@example.com' },
    });
    expect(entry.action).toBe('workos.authentication_password_failed');
    expect(entry.actorEmail).toBe('attacker@example.com');
    expect(entry.targetEmail).toBe('attacker@example.com');
    expect(entry.externalId).toBe('evt_001');
    expect(entry.summary).toContain('failed');
    expect(entry.summary).toContain('attacker@example.com');
  });

  it('falls_back_for_unknown_event_types', () => {
    const entry = eventToAuditEntry({
      id: 'evt_002',
      event: 'something.brand_new',
      data: {},
    });
    expect(entry.action).toBe('workos.something_brand_new');
    expect(entry.actorEmail).toBeNull();
    expect(entry.summary).toContain('something.brand_new');
  });

  it('extracts_email_from_nested_user_object', () => {
    const entry = eventToAuditEntry({
      id: 'evt_003',
      event: 'session.created',
      data: { user: { email: 'staff@peartree.org' } },
    });
    expect(entry.actorEmail).toBe('staff@peartree.org');
    expect(entry.summary).toContain('staff@peartree.org');
  });

  it('handles_user_lifecycle_events', () => {
    const created: WorkOSEvent = { id: 'a', event: 'user.created', data: { email: 'x@y.co' } };
    const updated: WorkOSEvent = { id: 'b', event: 'user.updated', data: { email: 'x@y.co' } };
    const deleted: WorkOSEvent = { id: 'c', event: 'user.deleted', data: { email: 'x@y.co' } };
    expect(eventToAuditEntry(created).action).toBe('workos.user_created');
    expect(eventToAuditEntry(updated).action).toBe('workos.user_updated');
    expect(eventToAuditEntry(deleted).action).toBe('workos.user_deleted');
  });

  it('handles_authentication_success_variants', () => {
    const variants = [
      'authentication.password_succeeded',
      'authentication.magic_auth_succeeded',
      'authentication.mfa_succeeded',
      'authentication.oauth_succeeded',
      'authentication.sso_succeeded',
      'authentication.email_verification_succeeded',
    ];
    for (const variant of variants) {
      const entry = eventToAuditEntry({ id: `e_${variant}`, event: variant, data: { email: 'u@p.org' } });
      expect(entry.action).toBe(`workos.${variant.replace(/\./g, '_')}`);
      expect(entry.summary).toContain('succeeded');
    }
  });
});
