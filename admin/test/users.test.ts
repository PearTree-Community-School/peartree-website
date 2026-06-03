import { describe, expect, it } from 'vitest';
import { createUsersRepo, openDatabase } from '../src/users.js';

function freshRepo() {
  const db = openDatabase(':memory:');
  return { db, users: createUsersRepo(db) };
}

describe('users repo', () => {
  it('starts_empty', () => {
    const { users } = freshRepo();
    expect(users.count()).toBe(0);
    expect(users.list()).toEqual([]);
    expect(users.findByWorkOSId('user_x')).toBeNull();
    expect(users.findByEmail('nobody@example.com')).toBeNull();
  });

  it('creates_and_reads_back_a_user_with_workos_id', () => {
    const { users } = freshRepo();
    const created = users.create({
      workosUserId: 'user_01',
      email: 'Admin@PearTree.org',
      role: 'super_admin',
    });
    expect(created.workosUserId).toBe('user_01');
    expect(created.role).toBe('super_admin');
    expect(created.status).toBe('active');
    expect(users.findByWorkOSId('user_01')?.email).toBe('Admin@PearTree.org');
    expect(users.findByEmail('admin@peartree.org')?.id).toBe(created.id);
  });

  it('creates_a_pending_user_without_workos_id', () => {
    const { users } = freshRepo();
    const invited = users.create({ email: 'pending@peartree.org', role: 'editor' });
    expect(invited.workosUserId).toBeNull();
    expect(invited.status).toBe('active');
  });

  it('links_workos_id_to_a_pending_user', () => {
    const { users } = freshRepo();
    const invited = users.create({ email: 'pending@peartree.org', role: 'editor' });
    const linked = users.linkWorkOSId(invited.id, 'user_99');
    expect(linked.workosUserId).toBe('user_99');
    expect(users.findByWorkOSId('user_99')?.email).toBe('pending@peartree.org');
  });

  it('updates_role_and_status', () => {
    const { users } = freshRepo();
    const u = users.create({ workosUserId: 'u', email: 'a@b.co', role: 'editor' });
    expect(users.updateRole(u.id, 'admin').role).toBe('admin');
    expect(users.setStatus(u.id, 'disabled').status).toBe('disabled');
  });

  it('counts_active_super_admins_excluding_disabled', () => {
    const { users, db } = freshRepo();
    users.create({ workosUserId: 'a', email: 'a@a.co', role: 'super_admin' });
    const b = users.create({ workosUserId: 'b', email: 'b@b.co', role: 'super_admin' });
    users.create({ workosUserId: 'c', email: 'c@c.co', role: 'editor' });
    expect(users.countActiveSuperAdmins()).toBe(2);
    db.prepare("UPDATE users SET status='disabled' WHERE id = ?").run(b.id);
    expect(users.countActiveSuperAdmins()).toBe(1);
  });

  it('records_login_timestamp', () => {
    const { users } = freshRepo();
    const created = users.create({ workosUserId: 'u', email: 'a@b.co', role: 'editor' });
    const t = new Date('2026-06-02T12:00:00Z');
    users.recordLogin(created.id, t);
    expect(users.findByWorkOSId('u')?.lastLoginAt?.toISOString()).toBe(t.toISOString());
  });

  it('enforces_unique_email', () => {
    const { users } = freshRepo();
    users.create({ email: 'dupe@b.co', role: 'admin' });
    expect(() => users.create({ email: 'dupe@b.co', role: 'editor' })).toThrow();
  });

  it('rejects_invalid_role_at_the_db_layer', () => {
    const db = openDatabase(':memory:');
    expect(() =>
      db.exec(
        "INSERT INTO users (workos_user_id, email, role, status, created_at) VALUES ('x','x@y.z','wizard','active',0)",
      ),
    ).toThrow();
  });
});
