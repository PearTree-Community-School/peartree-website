// Parent portal FAQ — edit/expand as needed.
// Source of truth is this file; all three variant portals render from here.

export interface FAQ {
  question: string;
  answer: string;
}

export const parentFAQ: FAQ[] = [
  {
    question: 'What time should I drop off and pick up my child?',
    answer:
      'Preschool: 8:00 AM drop-off, 5:00 PM pick-up (Mon–Fri). Elementary: 8:30 AM drop-off, 3:30 PM pick-up (Mon–Fri). Aftercare is available at the elementary campus; ask the front desk.',
  },
  {
    question: 'What should I do if my child is sick?',
    answer:
      'Please keep your child home if they have a fever, are vomiting, or have any symptoms of contagious illness. Notify the school by 8:00 AM via ParentSquare message or call (510) 817-4690. Children must be symptom-free for 24 hours before returning.',
  },
  {
    question: 'Is there a dress code or uniform?',
    answer:
      'No uniform. Children should wear comfortable, weather-appropriate clothes they can move and get messy in. Closed-toe shoes for outdoor play. Please label everything with your child\'s name.',
  },
  {
    question: 'What does my child need to bring each day?',
    answer:
      'A water bottle, a labeled lunch box (if not enrolled in lunch service), a change of clothes (especially for preschool), and weather gear. Avoid sending toys or valuables.',
  },
  {
    question: 'How does communication work?',
    answer:
      'Pear Tree uses ParentSquare for all school communication — daily digests, classroom posts, direct messages, photos, and event sign-ups. Most parents access it through the ParentSquare app on their phone. Links to your account are in the Parent Portal above.',
  },
  {
    question: 'What\'s the school calendar — when are half days and holidays?',
    answer:
      'The full calendar lives in ParentSquare. We mark half days, no-school days, parent-teacher conferences, and field trips there. Major upcoming dates also appear in the "This Month\'s Alerts" section above.',
  },
  {
    question: 'How do parent-teacher conferences work?',
    answer:
      'We hold formal parent-teacher conferences twice a year (fall and spring). Sign-ups go out through ParentSquare a few weeks in advance. Teachers are also available year-round for shorter check-ins — message them through ParentSquare or stop by during pickup.',
  },
  {
    question: 'Are parents expected to volunteer?',
    answer:
      'Yes — every Pear Tree family contributes volunteer hours each year. Examples: chaperone field trips, help at events, share a skill or cultural celebration, contribute to the Walk-a-Thon. Sign-up sheets appear on ParentSquare throughout the year.',
  },
  {
    question: 'Who do I talk to about financial aid?',
    answer:
      '80% of our families receive financial aid. Reach out to admin@peartreecs.com or call (510) 817-4690 to start a confidential conversation about tuition. Aid is need-based with a sliding scale.',
  },
  {
    question: 'Is there aftercare?',
    answer:
      'Yes, aftercare is available at the elementary campus (6925 Chabot Rd) until 5:30 PM, and the preschool day already runs until 5:00 PM. Pricing and enrollment details available from the front office.',
  },
  {
    question: 'What\'s the emergency / school-closure procedure?',
    answer:
      'In any emergency or weather closure, we notify families immediately via ParentSquare (push notification, email, and SMS). Make sure your contact info in ParentSquare is current. In a true emergency, dial 911 first, then notify the school.',
  },
  {
    question: 'How do I update my contact info or child\'s details?',
    answer:
      'Log into ParentSquare and update your profile under Account Settings. For any administrative changes (custody, allergies, medication, pickup authorization), email admin@peartreecs.com — those changes require a paper trail.',
  },
];
