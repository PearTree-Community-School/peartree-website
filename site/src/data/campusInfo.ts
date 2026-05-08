export interface Campus {
  name: string;
  address: string;
  city: string;
  zip?: string;
  hours: string;
  days: string;
  ages?: string;
  grades?: string;
  mapsUrl: string;
}

export const preschool: Campus = {
  name: 'Preschool',
  address: '8100 Winthrope Street',
  city: 'Oakland, CA',
  hours: '8:00 AM – 5:00 PM',
  days: 'Monday – Friday',
  ages: '2+',
  mapsUrl: 'https://maps.google.com/?q=8100+Winthrope+Street+Oakland+CA',
};

export const elementary: Campus = {
  name: 'Elementary',
  address: '6925 Chabot Road',
  city: 'Oakland, CA',
  zip: '94618',
  hours: '8:30 AM – 3:30 PM',
  days: 'Monday – Friday',
  grades: 'TK – 5th',
  mapsUrl: 'https://maps.google.com/?q=6925+Chabot+Road+Oakland+CA+94618',
};

export const phone = '(510) 817-4690';
export const phoneTel = 'tel:+15108174690';
export const email = 'admin@peartreecs.com';
export const facebook = 'https://www.facebook.com/peartreecs/';
