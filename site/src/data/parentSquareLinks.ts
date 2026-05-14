// Pear Tree's ParentSquare instance. School ID 22580.
// Unauthenticated visits bounce through ParentSquare login then redirect.
//
// Confirmed by school admin:
//   - Calendar
//   - Photos
//
// To be confirmed: messages, forms, directory (replace placeholder URLs).

export const ptcsParentSquare = {
  schoolId: 22580,
  baseUrl: 'https://www.parentsquare.com/schools/22580',

  calendar: 'https://www.parentsquare.com/schools/22580/calendars',
  photos: 'https://www.parentsquare.com/schools/22580/feeds/photos',
  feed: 'https://www.parentsquare.com/schools/22580/feeds',
  // Placeholders — confirm exact URLs with school:
  messages: 'https://www.parentsquare.com/messages',
  forms: 'https://www.parentsquare.com/schools/22580/forms',
  directory: 'https://www.parentsquare.com/schools/22580/directory',

  loginUrl: 'https://www.parentsquare.com/signin',
};

export interface ParentSquareLink {
  label: string;
  description: string;
  url: string;
  icon: 'calendar' | 'photos' | 'messages' | 'feed' | 'forms' | 'directory';
}

export const parentSquareLinks: ParentSquareLink[] = [
  {
    label: 'School Calendar',
    description: 'Half days, holidays, parent meetings, field trips, and events',
    url: ptcsParentSquare.calendar,
    icon: 'calendar',
  },
  {
    label: 'Messages',
    description: 'Your direct messages and class conversations',
    url: ptcsParentSquare.messages,
    icon: 'messages',
  },
  {
    label: 'Posts & Updates',
    description: 'Daily digests and announcements from the school',
    url: ptcsParentSquare.feed,
    icon: 'feed',
  },
  {
    label: 'Photos',
    description: 'Classroom moments and event galleries',
    url: ptcsParentSquare.photos,
    icon: 'photos',
  },
  {
    label: 'Forms & Sign-Ups',
    description: 'Permission slips, volunteer sign-ups, and surveys',
    url: ptcsParentSquare.forms,
    icon: 'forms',
  },
  {
    label: 'Directory',
    description: 'Connect with other parents and classroom contacts',
    url: ptcsParentSquare.directory,
    icon: 'directory',
  },
];
