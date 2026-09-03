// Site-wide settings that are not content.

export const SITE_URL = 'https://peartreecs.com';

// Privacy-friendly, cookie-free analytics. Plausible needs no consent banner,
// which matters for a school site. Register the domain at plausible.io (or
// point `scriptSrc` at a self-hosted instance); until then the script loads but
// records nothing. Set `domain` to '' to remove the tag entirely.
export const analytics = {
  domain: 'peartreecs.com',
  scriptSrc: 'https://plausible.io/js/script.outbound-links.js',
};

export const social = {
  facebook: 'https://www.facebook.com/peartreecs/',
};
