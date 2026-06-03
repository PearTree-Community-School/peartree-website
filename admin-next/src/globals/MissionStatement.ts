import type { GlobalConfig } from 'payload';

export const MissionStatement: GlobalConfig = {
  slug: 'mission-statement',
  admin: {
    group: 'Site',
    description: 'Mission, tagline, context, and the Baldwin quote.',
  },
  access: {
    read: () => true,
    update: ({ req }) => hasRole(req.user, ['super_admin', 'admin', 'editor']),
  },
  fields: [
    { name: 'tagline', type: 'text', required: true },
    { name: 'shortMission', type: 'textarea', required: true },
    { name: 'fullMission', type: 'textarea', required: true },
    { name: 'missionContext', type: 'textarea' },
    {
      name: 'baldwinQuote',
      type: 'group',
      fields: [
        { name: 'quote', type: 'textarea' },
        { name: 'source', type: 'text' },
      ],
    },
  ],
};

function hasRole(user: unknown, allowed: readonly string[]): boolean {
  if (!user || typeof user !== 'object') return false;
  const role = (user as { role?: string }).role;
  return Boolean(role && allowed.includes(role));
}
