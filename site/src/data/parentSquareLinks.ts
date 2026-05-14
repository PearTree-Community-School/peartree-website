// Pear Tree's ParentSquare instance. School ID 22580.
// Unauthenticated visitors get bounced through ParentSquare login then
// redirected to the requested page after sign-in.
//
// Only confirmed-working URLs included below.
// To add Messages / Forms / Directory cards: log into ParentSquare as a
// Pear Tree parent, navigate to the section you want, copy the URL, and
// add an entry here.

export const ptcsParentSquare = {
  schoolId: 22580,
  baseUrl: 'https://www.parentsquare.com/schools/22580',

  calendar: 'https://www.parentsquare.com/schools/22580/calendars',
  photos: 'https://www.parentsquare.com/schools/22580/feeds/photos',
  feed: 'https://www.parentsquare.com/schools/22580/feeds',

  // Generic ParentSquare entry — drops logged-in users in their feed,
  // prompts everyone else to sign in.
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
    label: 'Posts & Updates',
    description: 'Daily digests, classroom posts, messages, and announcements',
    url: ptcsParentSquare.feed,
    icon: 'feed',
  },
  {
    label: 'Photos',
    description: 'Classroom moments and event galleries',
    url: ptcsParentSquare.photos,
    icon: 'photos',
  },
];
