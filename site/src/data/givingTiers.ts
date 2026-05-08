export interface GivingTier {
  name: string;
  amount: string;
  impact: string;
}

export const annualFundTiers: GivingTier[] = [
  { name: 'Seeds', amount: 'Up to $99', impact: 'Provides art supplies for a classroom for one month' },
  { name: 'Roots', amount: '$100 – $499', impact: 'Funds a field trip for an entire class' },
  { name: 'Branches', amount: '$500 – $999', impact: 'Equips a classroom with new Montessori materials' },
  { name: 'Canopy', amount: '$1,000 – $2,499', impact: 'Provides professional development for a teacher' },
  { name: 'Orchard', amount: '$2,500 – $4,999', impact: 'Funds a semester of aftercare scholarships' },
  { name: "Founders' Circle", amount: '$5,000+', impact: 'Provides a full-year scholarship for one student' },
];
