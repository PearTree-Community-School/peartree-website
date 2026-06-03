import type { CollectionAfterChangeHook, CollectionAfterDeleteHook, CollectionConfig } from 'payload';
import { roles } from '../lib/policy';

const auditUserChange: CollectionAfterChangeHook = async ({ doc, previousDoc, operation, req }) => {
  const actorEmail = (req.user as { email?: string } | undefined)?.email ?? null;
  if (operation === 'create') {
    await req.payload.create({
      collection: 'audit-log',
      data: {
        action: 'user.invited',
        actorEmail: actorEmail ?? undefined,
        targetEmail: doc.email,
        summary: `Invited ${doc.email} as ${doc.role}.`,
      },
      overrideAccess: true,
    });
    return doc;
  }
  if (operation === 'update' && previousDoc) {
    const prevRole = (previousDoc as { role?: string }).role;
    const prevStatus = (previousDoc as { status?: string }).status;
    if (prevRole && prevRole !== doc.role) {
      await req.payload.create({
        collection: 'audit-log',
        data: {
          action: 'user.role_changed',
          actorEmail: actorEmail ?? undefined,
          targetEmail: doc.email,
          summary: `Role: ${prevRole} → ${doc.role}.`,
        },
        overrideAccess: true,
      });
    }
    if (prevStatus && prevStatus !== doc.status) {
      await req.payload.create({
        collection: 'audit-log',
        data: {
          action: 'user.status_changed',
          actorEmail: actorEmail ?? undefined,
          targetEmail: doc.email,
          summary: `Status: ${prevStatus} → ${doc.status}.`,
        },
        overrideAccess: true,
      });
    }
  }
  return doc;
};

const auditUserDelete: CollectionAfterDeleteHook = async ({ doc, req }) => {
  const actorEmail = (req.user as { email?: string } | undefined)?.email ?? null;
  await req.payload.create({
    collection: 'audit-log',
    data: {
      action: 'user.deleted',
      actorEmail: actorEmail ?? undefined,
      targetEmail: doc.email,
      summary: `Deleted user ${doc.email}.`,
    },
    overrideAccess: true,
  });
  return doc;
};

export const Users: CollectionConfig = {
  slug: 'users',
  auth: {
    // We disable Payload's built-in local strategy; auth comes from WorkOS via
    // a custom strategy attached at the app level.
    disableLocalStrategy: true,
  },
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'role', 'status', 'lastLoginAt'],
  },
  access: {
    read: ({ req }) => Boolean(req.user),
    create: ({ req }) => hasPermission(req.user, 'users:manage'),
    update: ({ req }) => hasPermission(req.user, 'users:manage'),
    delete: ({ req }) => hasPermission(req.user, 'users:manage'),
  },
  hooks: {
    afterChange: [auditUserChange],
    afterDelete: [auditUserDelete],
  },
  fields: [
    {
      name: 'email',
      type: 'email',
      required: true,
      unique: true,
      index: true,
    },
    {
      name: 'workosUserId',
      type: 'text',
      unique: true,
      index: true,
      admin: {
        description: 'WorkOS user ID. NULL until the invited user signs in for the first time.',
      },
    },
    {
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: 'editor',
      options: roles.map((r) => ({ label: r, value: r })),
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'active',
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Disabled', value: 'disabled' },
      ],
    },
    {
      name: 'firstName',
      type: 'text',
    },
    {
      name: 'lastName',
      type: 'text',
    },
    {
      name: 'lastLoginAt',
      type: 'date',
      admin: {
        readOnly: true,
        date: { pickerAppearance: 'dayAndTime' },
      },
    },
  ],
};

function hasPermission(user: unknown, perm: string): boolean {
  if (!user || typeof user !== 'object') return false;
  const role = (user as { role?: string }).role;
  if (!role) return false;
  // Inline permission check (can't import policy at top to avoid Payload bundling issues)
  const adminRoles = ['super_admin', 'admin'];
  if (perm === 'users:manage') return adminRoles.includes(role);
  return false;
}
