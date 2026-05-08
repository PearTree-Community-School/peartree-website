export interface MonthlyTier {
  amount: string;
  label: string;
}

export const monthlyTiers: MonthlyTier[] = [
  { amount: '$10/mo', label: 'Art supplies' },
  { amount: '$25/mo', label: 'Student materials' },
  { amount: '$50/mo', label: 'Program support' },
  { amount: '$100/mo', label: 'Scholarship fund' },
  { amount: '$250/mo', label: 'Faculty development' },
  { amount: 'Custom', label: 'Any amount helps' },
];
