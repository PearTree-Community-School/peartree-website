import type { CollectionAfterChangeHook } from 'payload';
import { lines, NOTIFY_TO, sendMail } from './mailer';

const ADMIN_URL = process.env['ADMIN_BASE_URL'] ?? 'https://admin.peartreecs.com';

function log(msg: string) {
  console.log(msg);
}

/**
 * Emails a family to confirm we received their tour request, and tells staff a
 * new one arrived.
 *
 * Cianan asked for the confirmation reply in May: families should know their
 * inquiry landed and that someone will follow up when a tour has availability.
 *
 * Fires on create only — editing a row in the grid must not re-send anything.
 */
export const notifyTourRequest: CollectionAfterChangeHook = async ({ doc, operation }) => {
  if (operation !== 'create') return doc;

  const d = doc as {
    id: number;
    parentName?: string;
    parentEmail?: string;
    parentPhone?: string;
    child1Name?: string;
    gradeApplyingFor?: string;
    campusInterest?: string;
    source?: string;
  };

  // To the family — only when they gave us an address, and never for rows a
  // staff member typed in by hand on someone's behalf.
  if (d.parentEmail && d.source === 'web_form') {
    void sendMail(
      {
        to: d.parentEmail,
        subject: 'We received your tour request — Pear Tree Community School',
        text: lines(
          `Hi ${d.parentName ?? 'there'},`,
          '',
          'Thank you for your interest in Pear Tree Community School. We have received your tour request.',
          '',
          'We will reach out personally once the next tour has availability, with dates and next steps.',
          '',
          'If anything changes in the meantime, just reply to this email and it will reach our office.',
          '',
          'Warmly,',
          'Pear Tree Community School',
          'peartreecs.com',
        ),
      },
      log,
    );
  }

  void sendMail(
    {
      to: NOTIFY_TO,
      subject: `New tour request — ${d.parentName ?? 'unknown'}`,
      text: lines(
        `${d.parentName ?? 'Someone'} requested a tour.`,
        '',
        d.parentEmail && `Email: ${d.parentEmail}`,
        d.parentPhone && `Phone: ${d.parentPhone}`,
        d.child1Name && `Child: ${d.child1Name}`,
        d.gradeApplyingFor && `Grade: ${d.gradeApplyingFor}`,
        d.campusInterest && `Campus: ${d.campusInterest}`,
        d.source && `Source: ${d.source}`,
        '',
        `Open it: ${ADMIN_URL}/sheets?sheet=tour-requests`,
      ),
    },
    log,
  );

  return doc;
};

/** Tells staff a new work request arrived. No family-facing mail here. */
export const notifyStaffRequest: CollectionAfterChangeHook = async ({ doc, operation }) => {
  if (operation !== 'create') return doc;

  const d = doc as {
    summary?: string;
    requesterName?: string;
    requesterEmail?: string;
    category?: string;
    priority?: string;
    location?: string;
    neededBy?: string;
    description?: string;
  };

  void sendMail(
    {
      to: NOTIFY_TO,
      replyTo: d.requesterEmail,
      subject: `[${d.priority ?? 'Medium'}] Staff request — ${d.summary ?? 'untitled'}`,
      text: lines(
        `${d.requesterName ?? 'A staff member'} submitted a work request.`,
        '',
        d.summary && `Request: ${d.summary}`,
        d.category && `Category: ${d.category}`,
        d.location && `Location: ${d.location}`,
        d.priority && `Priority: ${d.priority}`,
        d.neededBy && `Needed by: ${String(d.neededBy).slice(0, 10)}`,
        d.description && lines('', 'Details:', d.description),
        '',
        `Open it: ${ADMIN_URL}/sheets?sheet=staff-requests`,
      ),
    },
    log,
  );

  return doc;
};
