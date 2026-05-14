// Staff work-request categories — used by the staff portal form.
// Based on real K-8 ticketing systems + Montessori-specific additions.

export interface RequestCategory {
  id: string;
  label: string;
  desc: string;
}

export const requestCategories: RequestCategory[] = [
  { id: 'facilities', label: 'Facilities & Maintenance', desc: 'Broken/damaged items, lighting, plumbing, HVAC, cleaning' },
  { id: 'supplies', label: 'Classroom Supplies', desc: 'Paper, art supplies, consumables, books' },
  { id: 'tech', label: 'Technology Support', desc: 'Chromebooks, printers, WiFi, accounts' },
  { id: 'montessori', label: 'Montessori Materials', desc: 'Sensorial, practical life, language, math materials' },
  { id: 'plants-pets', label: 'Plants & Classroom Pets', desc: 'Plant supplies, soil, classroom pet food/bedding' },
  { id: 'curriculum', label: 'Curriculum & Books', desc: 'Book orders, lesson materials, field trip requests' },
  { id: 'hr', label: 'HR / Administrative', desc: 'PTO, substitute requests, payroll questions' },
  { id: 'room-booking', label: 'Room Booking', desc: 'Reserve classroom, gym, outdoor space' },
  { id: 'other', label: 'Other', desc: 'Anything else not covered above' },
];

export const priorityLevels = ['Low', 'Medium', 'High', 'Urgent'] as const;

export const locations = [
  // Classrooms
  'Dragonfly Classroom (Preschool)',
  'Butterfly Classroom (Preschool)',
  'Hummingbird Classroom (K–1)',
  'Falcon Classroom (2–3)',
  'Dolphin Classroom (4–5)',
  // Other on-campus
  'Front Office',
  'Preschool Campus — Outdoors',
  'Elementary Campus — Outdoors',
  'Both Campuses',
  'Other (specify in description)',
];
