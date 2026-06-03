import { describe, expect, it } from 'vitest';
import { roleHasPermission } from '../src/lib/policy';

describe('admin authorization policy', () => {
  it('super_admin_has_all_permissions', () => {
    expect(roleHasPermission('super_admin', 'users:manage')).toBe(true);
    expect(roleHasPermission('super_admin', 'content:publish')).toBe(true);
    expect(roleHasPermission('super_admin', 'audit:view')).toBe(true);
    expect(roleHasPermission('super_admin', 'settings:manage')).toBe(true);
  });

  it('admin_can_manage_users_but_not_settings', () => {
    expect(roleHasPermission('admin', 'users:manage')).toBe(true);
    expect(roleHasPermission('admin', 'content:publish')).toBe(true);
    expect(roleHasPermission('admin', 'settings:manage')).toBe(false);
  });

  it('editor_can_publish_but_not_manage_users', () => {
    expect(roleHasPermission('editor', 'content:publish')).toBe(true);
    expect(roleHasPermission('editor', 'users:manage')).toBe(false);
    expect(roleHasPermission('editor', 'audit:view')).toBe(false);
  });

  it('author_can_only_read_and_write_drafts', () => {
    expect(roleHasPermission('author', 'content:read')).toBe(true);
    expect(roleHasPermission('author', 'content:write')).toBe(true);
    expect(roleHasPermission('author', 'content:publish')).toBe(false);
  });

  it('viewer_is_read_only', () => {
    expect(roleHasPermission('viewer', 'content:read')).toBe(true);
    expect(roleHasPermission('viewer', 'audit:view')).toBe(true);
    expect(roleHasPermission('viewer', 'content:write')).toBe(false);
    expect(roleHasPermission('viewer', 'users:manage')).toBe(false);
  });
});
