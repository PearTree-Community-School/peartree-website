import { describe, expect, it } from 'vitest';
import { parseAdminEnv } from '../src/config.js';

describe('admin environment parsing', () => {
  it('reports_missing_workos_environment_without_secret_values', () => {
    const result = parseAdminEnv({
      WORKOS_API_KEY: 'sk_live_should_not_be_echoed',
      WORKOS_CLIENT_ID: '',
      WORKOS_COOKIE_PASSWORD: '',
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error('Expected admin env parsing to fail');
    }

    expect(result.message).toContain('WORKOS_API_KEY');
    expect(result.message).toContain('WORKOS_CLIENT_ID');
    expect(result.message).toContain('WORKOS_COOKIE_PASSWORD');
    expect(result.message).toContain('ADMIN_BASE_URL');
    expect(result.message).toContain('PUBLIC_SITE_BASE_URL');
    expect(result.message).toContain('WORKOS_REDIRECT_URI');
    expect(result.message).not.toContain('sk_live_should_not_be_echoed');
  });
});
