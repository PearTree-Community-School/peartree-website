// "This Month's Alerts" for the parent portal.
// Admin: update this file once a month. Each alert is a short heads-up
// (half days, school closures, key events, deadlines).
//
// Today's date should match the `month` field so visitors see current info.

export interface Alert {
  date: string; // free-form, e.g. "May 23" or "May 20–24"
  title: string;
  description: string;
  type?: 'closure' | 'event' | 'half-day' | 'deadline' | 'info';
}

export const currentMonth = 'May 2026';

export const alerts: Alert[] = [
  {
    date: 'May 23',
    title: 'Half day — 1:30 PM pickup',
    description: 'No aftercare on this date. Sign up for childcare if needed.',
    type: 'half-day',
  },
  {
    date: 'May 26',
    title: 'Memorial Day — no school',
    description: 'School is closed in observance of Memorial Day.',
    type: 'closure',
  },
  {
    date: 'May 30',
    title: 'Spring expo and learning showcase',
    description: 'Family event from 3:00–5:00 PM at the elementary campus. Bring boxes for student exhibits.',
    type: 'event',
  },
];
