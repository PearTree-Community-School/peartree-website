import { describe, expect, it } from 'vitest';
import { roleHasPermission } from '../src/policy.js';

describe('admin authorization policy', () => {
  it('super_admin_has_user_management_and_publish_permissions', () => {
    expect(roleHasPermission('super_admin', 'users:manage')).toBe(true);
    expect(roleHasPermission('super_admin', 'content:publish')).toBe(true);
    expect(roleHasPermission('super_admin', 'audit:view')).toBe(true);

    expect(roleHasPermission('viewer', 'users:manage')).toBe(false);
    expect(roleHasPermission('viewer', 'content:publish')).toBe(false);
    expect(roleHasPermission('viewer', 'audit:view')).toBe(true);
  });
});
