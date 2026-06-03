import type { GlobalConfig } from 'payload';

export const SchoolStats: GlobalConfig = {
  slug: 'school-stats',
  admin: {
    group: 'Site',
    description: 'Numeric stats shown on the homepage and elsewhere.',
  },
  access: {
    read: () => true,
    update: ({ req }) => hasRole(req.user, ['super_admin', 'admin', 'editor']),
  },
  fields: [
    { name: 'founded', type: 'number', required: true, defaultValue: 2012 },
    { name: 'studentsOfColor', type: 'number', admin: { description: 'Percent' } },
    { name: 'familiesReceivingAid', type: 'number', admin: { description: 'Percent' } },
    { name: 'exceedLiteracyBenchmarks', type: 'number', admin: { description: 'Percent' } },
    { name: 'staffCount', type: 'number' },
    { name: 'preschoolMinAge', type: 'number' },
    { name: 'elementaryGrades', type: 'text', defaultValue: 'TK–5' },
    {
      name: 'statsList',
      type: 'array',
      admin: { description: 'Ordered list of label/value pairs shown on the stats grid.' },
      fields: [
        { name: 'label', type: 'text', required: true },
        { name: 'value', type: 'text', required: true },
      ],
    },
  ],
};

function hasRole(user: unknown, allowed: readonly string[]): boolean {
  if (!user || typeof user !== 'object') return false;
  const role = (user as { role?: string }).role;
  return Boolean(role && allowed.includes(role));
}
