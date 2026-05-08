export interface Classroom {
  name: string;
  level: string;
  campus: 'preschool' | 'elementary';
}

export const classrooms: Classroom[] = [
  { name: 'Dragonfly', level: 'Preschool / Transitional Kindergarten', campus: 'preschool' },
  { name: 'Butterfly', level: 'Preschool / Transitional Kindergarten', campus: 'preschool' },
  { name: 'Hummingbird', level: 'Kindergarten / 1st Grade', campus: 'elementary' },
  { name: 'Falcon', level: '2nd / 3rd Grades', campus: 'elementary' },
  { name: 'Dolphin', level: '4th / 5th Grades', campus: 'elementary' },
];

export const preschoolCurriculum = [
  'Practical Life',
  'Sensory Exploration',
  'Cultural Studies',
  'Geography',
  'Mathematics',
  'Language Arts',
];

export const elementaryOutcomes = [
  'Decolonized history — precolonial civilizations, modern social justice movements',
  'Advanced literacy — 90% exceed national benchmarks',
  'Project-based STEM with design thinking',
  'Arts — visual arts, music, recording studio sessions',
  'Social-emotional development and conflict resolution',
  'Civic engagement and community participation',
];
