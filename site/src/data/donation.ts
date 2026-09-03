// Online giving.
//
// The school does not yet have a payment processor, so every "give" button
// falls back to a pre-filled email. As soon as a Zeffy, Givebutter, or Stripe
// Payment Link exists, paste it into `DONATION_URL` and every tier on the
// Support page becomes a one-click donation with the amount and frequency
// filled in. Nothing else on the site needs to change.
//
// Zeffy example:      https://www.zeffy.com/donation-form/<form-id>
// Givebutter example: https://givebutter.com/<campaign>
export const DONATION_URL = '';

// Named on the receipt donors get, so it belongs next to the donate button.
// Leave empty until the sponsor confirms the wording they want published.
export const FISCAL_SPONSOR = '';

export type Frequency = 'once' | 'monthly';

const email = 'admin@peartreecs.com';

/** Link for a gift of `amount` dollars (omit for "any amount"). */
export function giveLink(amount?: number, frequency: Frequency = 'once'): string {
  if (DONATION_URL) {
    const url = new URL(DONATION_URL);
    if (amount) url.searchParams.set('amount', String(amount));
    url.searchParams.set('frequency', frequency === 'monthly' ? 'monthly' : 'once');
    return url.toString();
  }
  const what = amount
    ? `$${amount.toLocaleString('en-US')}${frequency === 'monthly' ? ' per month' : ''}`
    : frequency === 'monthly' ? 'a monthly gift' : 'a gift';
  const subject = encodeURIComponent(`I would like to make ${what} to Pear Tree`);
  const body = encodeURIComponent(
    `Hello,\n\nI would like to give ${what} to Pear Tree Community School. Please send me the details.\n\nThank you,\n`,
  );
  return `mailto:${email}?subject=${subject}&body=${body}`;
}

/** True once a real payment link is configured. Copy on the page changes to match. */
export const onlineGivingEnabled = DONATION_URL !== '';

export const oneTimeTiers = [
  { name: 'Seeds', amount: 50, range: 'Up to $99', impact: 'Provides art supplies for a classroom for one month' },
  { name: 'Roots', amount: 100, range: '$100 – $499', impact: 'Funds a field trip for an entire class' },
  { name: 'Branches', amount: 500, range: '$500 – $999', impact: 'Equips a classroom with new Montessori materials' },
  { name: 'Canopy', amount: 1000, range: '$1,000 – $2,499', impact: 'Provides professional development for a teacher' },
  { name: 'Orchard', amount: 2500, range: '$2,500 – $4,999', impact: 'Funds a semester of aftercare scholarships' },
  { name: "Founders' Circle", amount: 5000, range: '$5,000+', impact: 'Provides a full-year scholarship for one student' },
];

export const quickAmounts = [25, 50, 100, 250, 500];

export const monthlyTiers = [
  { amount: 10, label: 'Art supplies' },
  { amount: 25, label: 'Student materials' },
  { amount: 50, label: 'Program support' },
  { amount: 100, label: 'Scholarship fund' },
  { amount: 250, label: 'Faculty development' },
];
