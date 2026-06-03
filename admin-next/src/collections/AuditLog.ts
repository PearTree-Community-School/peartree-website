import type { CollectionConfig } from 'payload';

export const AuditLog: CollectionConfig = {
  slug: 'audit-log',
  admin: {
    useAsTitle: 'summary',
    defaultColumns: ['action', 'actorEmail', 'targetEmail', 'summary', 'createdAt'],
    description: 'Append-only audit log of state-changing admin actions and sign-in events.',
  },
  access: {
    read: ({ req }) => Boolean(req.user && hasAuditView(req.user)),
    create: ({ req }) => Boolean(req.user), // Created by server code only; UI hides create button
    update: () => false, // Immutable
    delete: () => false, // Immutable
  },
  fields: [
    { name: 'action', type: 'text', required: true, index: true },
    { name: 'actorUserId', type: 'number' },
    { name: 'actorEmail', type: 'email', index: true },
    { name: 'targetUserId', type: 'number' },
    { name: 'targetEmail', type: 'email', index: true },
    { name: 'summary', type: 'text', required: true },
    {
      name: 'externalId',
      type: 'text',
      unique: true,
      index: true,
      admin: { description: 'External event ID (e.g., WorkOS webhook event id) for idempotency.' },
    },
  ],
  timestamps: true,
};

function hasAuditView(user: unknown): boolean {
  if (!user || typeof user !== 'object') return false;
  const role = (user as { role?: string }).role;
  if (!role) return false;
  return ['super_admin', 'admin', 'viewer'].includes(role);
}
