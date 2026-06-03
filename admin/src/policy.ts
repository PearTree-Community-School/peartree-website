export const permissions = [
  'users:manage',
  'content:read',
  'content:write',
  'content:publish',
  'media:manage',
  'settings:manage',
  'audit:view',
] as const;

export type Permission = (typeof permissions)[number];

export const roles = ['super_admin', 'admin', 'editor', 'author', 'viewer'] as const;

export type Role = (typeof roles)[number];

const rolePermissions: Record<Role, readonly Permission[]> = {
  super_admin: permissions,
  admin: ['users:manage', 'content:read', 'content:write', 'content:publish', 'media:manage', 'audit:view'],
  editor: ['content:read', 'content:write', 'content:publish', 'media:manage'],
  author: ['content:read', 'content:write'],
  viewer: ['content:read', 'audit:view'],
};

export function roleHasPermission(role: Role, permission: Permission): boolean {
  return rolePermissions[role].includes(permission);
}
