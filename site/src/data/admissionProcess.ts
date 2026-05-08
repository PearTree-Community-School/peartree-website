export interface ProcessStep {
  step: string;
  title: string;
  desc: string;
}

export const admissionProcess: ProcessStep[] = [
  { step: '1', title: 'Schedule a Tour', desc: 'Visit our campus, meet our teachers, and see Montessori in action. Tours are the best way to experience what makes Pear Tree different.' },
  { step: '2', title: 'Submit an Application', desc: "Complete the application form and share your family's story with us. We review each application holistically — there are no test scores or academic prerequisites." },
  { step: '3', title: 'Financial Aid Conversation', desc: "We'll work with every family to find a tuition level that works. Our commitment to access means we will find a way." },
  { step: '4', title: 'Welcome to Pear Tree', desc: "Once accepted, you'll join a community of families who are invested in building something different together." },
];

export const aidPoints = [
  '80% of families receive need-based financial aid',
  'Sliding scale tuition based on ability to pay',
  'No family has ever been turned away due to inability to pay',
  'BASIC Fund scholarships available (up to $2,750/year per child)',
];
