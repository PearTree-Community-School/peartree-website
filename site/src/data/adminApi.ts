// Where the public forms send submissions.
//
// The site is static (GitHub Pages) and cannot accept a POST itself, so forms
// post cross-origin to the admin app. That origin is on the admin's CORS
// allowlist — update both together if this moves.
export const ADMIN_API_BASE = 'https://peartree-admin.fly.dev';

export const submitEndpoints = {
  tour: `${ADMIN_API_BASE}/api/submit/tour`,
  staff: `${ADMIN_API_BASE}/api/submit/staff`,
};
