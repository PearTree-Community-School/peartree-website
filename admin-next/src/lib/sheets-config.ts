/**
 * Column definitions for PearTree Sheets.
 *
 * Shared by the server page (to select fields) and the client grid (to render
 * and edit them), so the two can never disagree about what a column is.
 */

export type ColumnType = 'text' | 'email' | 'tel' | 'date' | 'select' | 'longtext';

export type SheetColumn = {
  readonly key: string;
  readonly label: string;
  readonly type: ColumnType;
  /** Grid track width, any CSS length. */
  readonly width: string;
  readonly options?: ReadonlyArray<{ value: string; label: string; tone?: Tone }>;
};

/** Drives the status pill colour. Kept abstract so collections can share tones. */
export type Tone = 'new' | 'active' | 'waiting' | 'done' | 'dead';

export type SheetDef = {
  readonly slug: string;
  readonly label: string;
  readonly titleField: string;
  readonly columns: readonly SheetColumn[];
};

const TOUR_STATUS: SheetColumn['options'] = [
  { value: 'new', label: 'New', tone: 'new' },
  { value: 'contacted', label: 'Contacted', tone: 'active' },
  { value: 'tour_scheduled', label: 'Tour scheduled', tone: 'active' },
  { value: 'tour_completed', label: 'Tour completed', tone: 'waiting' },
  { value: 'applied', label: 'Applied', tone: 'waiting' },
  { value: 'enrolled', label: 'Enrolled', tone: 'done' },
  { value: 'closed', label: 'Closed', tone: 'dead' },
  { value: 'spam', label: 'Spam', tone: 'dead' },
];

const STAFF_STATUS: SheetColumn['options'] = [
  { value: 'new', label: 'New', tone: 'new' },
  { value: 'acknowledged', label: 'Acknowledged', tone: 'active' },
  { value: 'in_progress', label: 'In progress', tone: 'active' },
  { value: 'blocked', label: 'Blocked', tone: 'waiting' },
  { value: 'completed', label: 'Completed', tone: 'done' },
  { value: 'wont_do', label: "Won't do", tone: 'dead' },
  { value: 'spam', label: 'Spam', tone: 'dead' },
];

const PRIORITY = [
  { value: 'Low', label: 'Low' },
  { value: 'Medium', label: 'Medium' },
  { value: 'High', label: 'High' },
  { value: 'Urgent', label: 'Urgent' },
];

export const SHEETS: readonly SheetDef[] = [
  {
    slug: 'tour-requests',
    label: 'Tour Requests',
    titleField: 'parentName',
    columns: [
      { key: 'status', label: 'Status', type: 'select', width: '150px', options: TOUR_STATUS },
      { key: 'parentName', label: 'Parent', type: 'text', width: '170px' },
      { key: 'parentPhone', label: 'Phone', type: 'tel', width: '140px' },
      { key: 'parentEmail', label: 'Email', type: 'email', width: '210px' },
      { key: 'child1Name', label: 'Child', type: 'text', width: '150px' },
      { key: 'gradeApplyingFor', label: 'Grade', type: 'text', width: '110px' },
      { key: 'followUpAt', label: 'Follow up', type: 'date', width: '130px' },
      { key: 'tourDate', label: 'Tour date', type: 'date', width: '130px' },
      { key: 'notes', label: 'Notes', type: 'longtext', width: '260px' },
    ],
  },
  {
    slug: 'staff-requests',
    label: 'Staff Requests',
    titleField: 'summary',
    columns: [
      { key: 'status', label: 'Status', type: 'select', width: '150px', options: STAFF_STATUS },
      { key: 'priority', label: 'Priority', type: 'select', width: '110px', options: PRIORITY },
      { key: 'summary', label: 'Request', type: 'text', width: '230px' },
      { key: 'requesterName', label: 'Requested by', type: 'text', width: '160px' },
      { key: 'location', label: 'Location', type: 'text', width: '180px' },
      { key: 'neededBy', label: 'Needed by', type: 'date', width: '130px' },
      { key: 'notes', label: 'Notes', type: 'longtext', width: '260px' },
    ],
  },
];

export function getSheet(slug: string | undefined): SheetDef {
  return SHEETS.find((s) => s.slug === slug) ?? SHEETS[0]!;
}
