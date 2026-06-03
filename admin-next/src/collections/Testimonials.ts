import type { CollectionConfig } from 'payload';

export const Testimonials: CollectionConfig = {
  slug: 'testimonials',
  admin: {
    useAsTitle: 'source',
    defaultColumns: ['source', 'origin', 'quote', 'updatedAt'],
    group: 'Content',
  },
  access: {
    read: () => true, // Public site fetches these
    create: ({ req }) => hasRole(req.user, ['super_admin', 'admin', 'editor', 'author']),
    update: ({ req }) => hasRole(req.user, ['super_admin', 'admin', 'editor', 'author']),
    delete: ({ req }) => hasRole(req.user, ['super_admin', 'admin', 'editor']),
  },
  fields: [
    {
      name: 'quote',
      type: 'textarea',
      required: true,
    },
    {
      name: 'source',
      type: 'text',
      required: true,
      admin: { description: 'Who said this (e.g., "Current Parent")' },
    },
    {
      name: 'origin',
      type: 'text',
      admin: { description: 'Where it came from (e.g., "Berkeley Parents Network")' },
    },
    {
      name: 'displayOrder',
      type: 'number',
      defaultValue: 0,
      admin: { description: 'Lower numbers appear first.' },
    },
  ],
  versions: {
    drafts: true,
  },
  timestamps: true,
};

function hasRole(user: unknown, allowed: readonly string[]): boolean {
  if (!user || typeof user !== 'object') return false;
  const role = (user as { role?: string }).role;
  return Boolean(role && allowed.includes(role));
}
