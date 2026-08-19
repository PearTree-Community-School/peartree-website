import type { CollectionConfig } from 'payload';
import { notifyContactRequest } from '../lib/submission-emails';

/**
 * General enquiries from the website contact form.
 *
 * Every submission since the site moved to GitHub Pages was silently discarded
 * — the form POSTed to a static host and got a 405. Storing them here means a
 * message survives even if the notification email fails.
 */
export const ContactRequests: CollectionConfig = {
  slug: 'contact-requests',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'email', 'phone', 'status', 'createdAt'],
    group: 'Submissions',
    description: 'General enquiries from the website contact form.',
  },
  access: {
    // Public writes go through /api/submit/contact, which applies origin checks,
    // a honeypot and rate limiting before creating with overrideAccess.
    create: ({ req }) => hasRole(req.user, ['super_admin', 'admin', 'editor']),
    read: ({ req }) => hasRole(req.user, ['super_admin', 'admin', 'editor', 'viewer']),
    update: ({ req }) => hasRole(req.user, ['super_admin', 'admin', 'editor']),
    delete: ({ req }) => hasRole(req.user, ['super_admin', 'admin']),
  },
  fields: [
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'new',
      index: true,
      options: [
        { label: 'New', value: 'new' },
        { label: 'Replied', value: 'replied' },
        { label: 'Closed', value: 'closed' },
        { label: 'Spam / junk', value: 'spam' },
      ],
    },
    { name: 'notes', type: 'textarea', admin: { description: 'Internal notes.' } },
    { name: 'name', type: 'text', required: true, index: true },
    { name: 'email', type: 'email', index: true },
    { name: 'phone', type: 'text' },
    { name: 'message', type: 'textarea' },
  ],
  hooks: {
    afterChange: [notifyContactRequest],
  },
  timestamps: true,
};

function hasRole(user: unknown, allowed: readonly string[]): boolean {
  if (!user || typeof user !== 'object') return false;
  const role = (user as { role?: string }).role;
  return Boolean(role && allowed.includes(role));
}
