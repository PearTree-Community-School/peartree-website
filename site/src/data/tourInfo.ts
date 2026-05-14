// Tour scheduling — posts to the school's existing Google Form so the admin
// team's monitoring workflow stays the same.
//
// Form: "Pear Tree Tour Registration Form" (admin@peartreecs.com)
// Extracted from FB_PUBLIC_LOAD_DATA_ on the live form.

export const tourForm = {
  // Public viewform URL (for fallback link if JS is disabled)
  viewUrl:
    'https://docs.google.com/forms/d/e/1FAIpQLSc5dZY3NWHbR636lIAmWQTpSmhNokbM8YkFNtmcvr15yeKeHQ/viewform',
  // POST endpoint (formResponse). Submit with mode:'no-cors' — we can't read
  // the response, but the submission lands in the Google Form's response sheet.
  postUrl:
    'https://docs.google.com/forms/d/e/1FAIpQLSc5dZY3NWHbR636lIAmWQTpSmhNokbM8YkFNtmcvr15yeKeHQ/formResponse',

  // Field entry IDs — DO NOT change without re-inspecting the live form.
  fields: {
    parentFirstName: 'entry.248809518',
    parentLastName: 'entry.1651792547',
    parentEmail: 'entry.1501090340',
    parentPhone: 'entry.1834306917',
    child1FirstName: 'entry.167237355',
    child1LastName: 'entry.1135498648',
    child1DOB: 'entry.649370930', // date — split into _year/_month/_day on submit
    child2FirstName: 'entry.56104376',
    child2LastName: 'entry.1689350503',
    child2DOB: 'entry.1640295582', // date — same split
    gradeApplyingFor: 'entry.738843554',
    desiredStartDate: 'entry.1824710312',
    campusInterest: 'entry.265815983',
  },

  // Dropdown options — must match Google Form exactly.
  gradeOptions: ['Preschool', 'TK', 'Kindergarten', '1st', '2nd', '3rd', '4th', '5th'],
  startDateOptions: ['Immediate', 'January 2026', 'September 2026'],
  campusOptions: ['Winthrope (Preschool)', 'Chabot (Preschool and Elementary)'],
};

// Tour schedule copy (from peartreecs.com)
export const tourCopy = {
  schedule: 'Tours every Thursday',
  responseTime: 'Our admin team will reach out within 2 business days to confirm a time.',
  contactEmail: 'admin@peartreecs.com',
  contactPhone: '(510) 817-4690',
};
