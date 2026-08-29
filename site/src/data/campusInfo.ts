// The school runs two buildings, and Chabot hosts both programs.
//
// This is modelled location-first — campuses are places, programs are what
// happens in them — because organising it program-first forces Chabot to be
// printed twice under two headings, which reads to a parent like a mistake.
// Ask "which building do I drive to?" and this shape answers it directly.

export interface Campus {
  /** Short name used as a heading, e.g. "Winthrope Campus". */
  name: string;
  address: string;
  city: string;
  zip: string;
  /** What runs at this location. */
  programs: string;
  mapsUrl: string;
}

export const winthrope: Campus = {
  name: 'Winthrope Campus',
  address: '8100 Winthrope Street',
  city: 'Oakland, CA',
  zip: '94605',
  programs: 'Preschool',
  mapsUrl: 'https://maps.google.com/?q=8100+Winthrope+Street+Oakland+CA+94605',
};

export const chabot: Campus = {
  name: 'Chabot Campus',
  address: '6925 Chabot Road',
  city: 'Oakland, CA',
  zip: '94618',
  programs: 'Preschool & Elementary',
  mapsUrl: 'https://maps.google.com/?q=6925+Chabot+Road+Oakland+CA+94618',
};

/** Every location, in the order they should be listed. */
export const campuses: Campus[] = [winthrope, chabot];

export interface Program {
  name: string;
  /** Locations this program runs at. */
  campuses: Campus[];
  hours: string;
  days: string;
  ages?: string;
  grades?: string;
}

export const preschool: Program = {
  name: 'Preschool',
  campuses: [winthrope, chabot],
  hours: '8:00 AM – 5:00 PM',
  days: 'Monday – Friday',
  ages: '2+',
};

export const elementary: Program = {
  name: 'Elementary',
  campuses: [chabot],
  hours: '8:30 AM – 3:30 PM',
  days: 'Monday – Friday',
  grades: 'K – 5th',
};

export const phone = '(510) 817-4690';
export const phoneTel = 'tel:+15108174690';
export const email = 'admin@peartreecs.com';
export const facebook = 'https://www.facebook.com/peartreecs/';
