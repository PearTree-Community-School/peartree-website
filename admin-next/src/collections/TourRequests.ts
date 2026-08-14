import type { CollectionConfig } from 'payload';

/**
 * Tour requests — the enrollment pipeline.
 *
 * A row starts life as whatever the family typed into the form, then accrues
 * the parts that matter: who followed up, what was said, where it landed.
 * The submitted fields are the beginning of the record, not the whole of it.
 *
 * Contains children's names and dates of birth, so `read` is staff-only and
 * there is no public read access anywhere in this file.
 */
export const TourRequests: CollectionConfig = {
  slug: 'tour-requests',
  admin: {
    useAsTitle: 'parentName',
    defaultColumns: ['parentName', 'parentEmail', 'gradeApplyingFor', 'status', 'followUpAt', 'createdAt'],
    group: 'Submissions',
    description: 'Tour and enrollment inquiries. Track each family from first contact to enrolled.',
  },
  access: {
    // Public: the website form POSTs here. Everything else requires a signed-in
    // staff user — these records hold minors' PII.
    create: () => true,
    read: ({ req }) => hasRole(req.user, ['super_admin', 'admin', 'editor', 'viewer']),
    update: ({ req }) => hasRole(req.user, ['super_admin', 'admin', 'editor']),
    delete: ({ req }) => hasRole(req.user, ['super_admin', 'admin']),
  },
  fields: [
    // ---- workflow: the part staff actually maintain ----
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'new',
      index: true,
      options: [
        { label: 'New', value: 'new' },
        { label: 'Contacted', value: 'contacted' },
        { label: 'Tour scheduled', value: 'tour_scheduled' },
        { label: 'Tour completed', value: 'tour_completed' },
        { label: 'Applied', value: 'applied' },
        { label: 'Enrolled', value: 'enrolled' },
        { label: 'Closed — no longer interested', value: 'closed' },
        { label: 'Spam / junk', value: 'spam' },
      ],
    },
    {
      name: 'notes',
      type: 'textarea',
      admin: { description: 'Running notes — calls made, emails sent, what was agreed.' },
    },
    {
      name: 'followUpAt',
      type: 'date',
      index: true,
      admin: { description: 'Next action due. Leave blank when nothing is pending.' },
    },
    {
      name: 'tourDate',
      type: 'date',
      admin: { description: 'The scheduled tour, once one is booked.' },
    },

    // ---- as submitted ----
    { name: 'parentName', type: 'text', required: true, index: true },
    { name: 'parentEmail', type: 'email', index: true },
    { name: 'parentPhone', type: 'text' },
    { name: 'child1Name', type: 'text' },
    { name: 'child1DOB', type: 'date' },
    { name: 'child2Name', type: 'text' },
    { name: 'child2DOB', type: 'date' },
    { name: 'gradeApplyingFor', type: 'text', index: true },
    { name: 'desiredStartDate', type: 'text' },
    { name: 'campusInterest', type: 'text' },

    // ---- provenance ----
    {
      name: 'source',
      type: 'select',
      required: true,
      defaultValue: 'web_form',
      options: [
        { label: 'Website form', value: 'web_form' },
        { label: 'Phone call', value: 'phone' },
        { label: 'In person', value: 'in_person' },
        { label: 'Email', value: 'email' },
        { label: 'Entered manually', value: 'manual' },
      ],
      admin: { description: 'Where this came from. Use Phone/Manual for inquiries you add yourself.' },
    },
  ],
  timestamps: true,
};

function hasRole(user: unknown, allowed: readonly string[]): boolean {
  if (!user || typeof user !== 'object') return false;
  const role = (user as { role?: string }).role;
  return Boolean(role && allowed.includes(role));
}
