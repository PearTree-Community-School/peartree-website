// Pear Tree's ParentSquare instance. School ID 22580.
// Unauthenticated visitors get bounced through ParentSquare login then
// redirected to the requested page after sign-in.
//
// URL strategy: use the generic /schools/22580/<section> form (NOT a
// per-user URL like /schools/22580/users/<id>/chats). ParentSquare
// resolves the section for the authenticated user automatically.

export const ptcsParentSquare = {
  schoolId: 22580,
  baseUrl: 'https://www.parentsquare.com/schools/22580',

  calendar: 'https://www.parentsquare.com/schools/22580/calendars',
  photos: 'https://www.parentsquare.com/schools/22580/feeds/photos',
  feed: 'https://www.parentsquare.com/schools/22580/feeds',
  messages: 'https://www.parentsquare.com/schools/22580/chats',
  directory: 'https://www.parentsquare.com/schools/22580/users',

  // Forms URL: still unknown. To resolve: log into ParentSquare, navigate
  // to the Forms section (sign-ups, permission slips, surveys), and copy
  // the URL — then add a `forms:` entry here and a corresponding link below.

  signIn: 'https://www.parentsquare.com/signin',
  home: 'https://www.parentsquare.com',
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
    description: 'Daily digests, classroom posts, and announcements',
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
    label: 'Directory',
    description: 'Connect with other parents and classroom contacts',
    url: ptcsParentSquare.directory,
    icon: 'directory',
  },
];
