import type { CollectionConfig } from 'payload';

export const ParentFAQ: CollectionConfig = {
  slug: 'parent-faq',
  admin: {
    useAsTitle: 'question',
    defaultColumns: ['question', 'displayOrder', 'updatedAt'],
    group: 'Content',
    description: 'FAQ items shown on the Parents page.',
  },
  access: {
    read: () => true,
    create: ({ req }) => hasRole(req.user, ['super_admin', 'admin', 'editor', 'author']),
    update: ({ req }) => hasRole(req.user, ['super_admin', 'admin', 'editor', 'author']),
    delete: ({ req }) => hasRole(req.user, ['super_admin', 'admin', 'editor']),
  },
  fields: [
    {
      name: 'question',
      type: 'text',
      required: true,
    },
    {
      name: 'answer',
      type: 'textarea',
      required: true,
    },
    {
      name: 'displayOrder',
      type: 'number',
      defaultValue: 0,
    },
  ],
  versions: { drafts: true },
  timestamps: true,
};

function hasRole(user: unknown, allowed: readonly string[]): boolean {
  if (!user || typeof user !== 'object') return false;
  const role = (user as { role?: string }).role;
  return Boolean(role && allowed.includes(role));
}
