/**
 * Options for the staff work-request form.
 *
 * Mirrors site/src/data/staffRequestCategories.ts, which the public site used
 * before the form moved behind sign-in. The ids must stay in step with the
 * `category` select on the StaffRequests collection.
 */

export const CATEGORIES = [
  { id: 'facilities', label: 'Facilities & Maintenance', desc: 'Broken or damaged items, lighting, plumbing, HVAC, cleaning' },
  { id: 'supplies', label: 'Classroom Supplies', desc: 'Paper, art supplies, consumables, books' },
  { id: 'tech', label: 'Technology Support', desc: 'Chromebooks, printers, WiFi, accounts' },
  { id: 'montessori', label: 'Montessori Materials', desc: 'Sensorial, practical life, language, math materials' },
  { id: 'plants-pets', label: 'Plants & Classroom Pets', desc: 'Plant supplies, soil, classroom pet food or bedding' },
  { id: 'curriculum', label: 'Curriculum & Books', desc: 'Book orders, lesson materials, field trips' },
  { id: 'hr', label: 'HR / Administrative', desc: 'PTO, substitute requests, payroll questions' },
  { id: 'room-booking', label: 'Room Booking', desc: 'Reserve a classroom, the gym, or outdoor space' },
  { id: 'other', label: 'Other', desc: 'Anything not covered above' },
] as const;

export const PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'] as const;

export const LOCATIONS = [
  'Dragonfly Classroom (Preschool)',
  'Butterfly Classroom (Preschool)',
  'Hummingbird Classroom (K–1)',
  'Falcon Classroom (2–3)',
  'Dolphin Classroom (4–5)',
  'Front Office',
  'Preschool Campus — Outdoors',
  'Elementary Campus — Outdoors',
  'Both Campuses',
  'Other (specify in description)',
] as const;

export const CATEGORY_IDS: ReadonlySet<string> = new Set(CATEGORIES.map((c) => c.id));
