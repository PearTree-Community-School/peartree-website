import type { CollectionConfig } from 'payload';

/**
 * Staff work requests — the maintenance/supplies queue.
 *
 * Same lifecycle shape as tour requests: submitted fields up front, then
 * status and notes carry the actual work. Categories, priorities, and
 * locations mirror site/src/data/staffRequestCategories.ts — keep them in
 * step if that file changes.
 */
export const StaffRequests: CollectionConfig = {
  slug: 'staff-requests',
  admin: {
    useAsTitle: 'summary',
    defaultColumns: ['summary', 'category', 'priority', 'location', 'status', 'createdAt'],
    group: 'Submissions',
    description: 'Facilities, supplies, tech, and other staff requests.',
  },
  access: {
    // Public writes go through /api/submit/staff, which applies origin checks,
    // a honeypot, and rate limiting before calling create with overrideAccess.
    create: ({ req }) => hasRole(req.user, ['super_admin', 'admin', 'editor']),
    read: ({ req }) => hasRole(req.user, ['super_admin', 'admin', 'editor', 'viewer']),
    update: ({ req }) => hasRole(req.user, ['super_admin', 'admin', 'editor']),
    delete: ({ req }) => hasRole(req.user, ['super_admin', 'admin']),
  },
  fields: [
    // ---- workflow ----
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'new',
      index: true,
      options: [
        { label: 'New', value: 'new' },
        { label: 'Acknowledged', value: 'acknowledged' },
        { label: 'In progress', value: 'in_progress' },
        { label: 'Blocked / waiting', value: 'blocked' },
        { label: 'Completed', value: 'completed' },
        { label: "Won't do", value: 'wont_do' },
        { label: 'Spam / junk', value: 'spam' },
      ],
    },
    {
      name: 'notes',
      type: 'textarea',
      admin: { description: 'What was done, who did it, what it cost.' },
    },
    { name: 'completedAt', type: 'date' },

    // ---- as submitted ----
    {
      name: 'summary',
      type: 'text',
      required: true,
      admin: { description: 'Short title for the request.' },
    },
    { name: 'description', type: 'textarea' },
    {
      name: 'category',
      type: 'select',
      index: true,
      options: [
        { label: 'Facilities & Maintenance', value: 'facilities' },
        { label: 'Classroom Supplies', value: 'supplies' },
        { label: 'Technology Support', value: 'tech' },
        { label: 'Montessori Materials', value: 'montessori' },
        { label: 'Plants & Classroom Pets', value: 'plants-pets' },
        { label: 'Curriculum & Books', value: 'curriculum' },
        { label: 'HR / Administrative', value: 'hr' },
        { label: 'Room Booking', value: 'room-booking' },
        { label: 'Other', value: 'other' },
      ],
    },
    {
      name: 'priority',
      type: 'select',
      defaultValue: 'Medium',
      index: true,
      options: ['Low', 'Medium', 'High', 'Urgent'].map((p) => ({ label: p, value: p })),
    },
    { name: 'location', type: 'text' },
    { name: 'neededBy', type: 'date' },

    // ---- who asked ----
    { name: 'requesterName', type: 'text', required: true, index: true },
    { name: 'requesterEmail', type: 'email', index: true },

    {
      name: 'source',
      type: 'select',
      required: true,
      defaultValue: 'web_form',
      options: [
        { label: 'Staff portal form', value: 'web_form' },
        { label: 'Entered manually', value: 'manual' },
      ],
    },
  ],
  timestamps: true,
};

function hasRole(user: unknown, allowed: readonly string[]): boolean {
  if (!user || typeof user !== 'object') return false;
  const role = (user as { role?: string }).role;
  return Boolean(role && allowed.includes(role));
}
