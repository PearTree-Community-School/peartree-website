import type { CollectionConfig } from 'payload';

export const Classrooms: CollectionConfig = {
  slug: 'classrooms',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'level', 'campus', 'displayOrder'],
    group: 'Content',
  },
  access: {
    read: () => true,
    create: ({ req }) => hasRole(req.user, ['super_admin', 'admin', 'editor', 'author']),
    update: ({ req }) => hasRole(req.user, ['super_admin', 'admin', 'editor', 'author']),
    delete: ({ req }) => hasRole(req.user, ['super_admin', 'admin', 'editor']),
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'level', type: 'text', required: true, admin: { description: 'e.g., "Preschool / Transitional Kindergarten"' } },
    {
      name: 'campus',
      type: 'select',
      required: true,
      options: [
        { label: 'Preschool', value: 'preschool' },
        { label: 'Elementary', value: 'elementary' },
      ],
    },
    { name: 'displayOrder', type: 'number', defaultValue: 0 },
  ],
  versions: { drafts: true },
  timestamps: true,
};

function hasRole(user: unknown, allowed: readonly string[]): boolean {
  if (!user || typeof user !== 'object') return false;
  const role = (user as { role?: string }).role;
  return Boolean(role && allowed.includes(role));
}
