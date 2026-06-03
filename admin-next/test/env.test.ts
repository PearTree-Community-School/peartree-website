import { describe, expect, it } from 'vitest';

describe('env validation', () => {
  it('rejects_missing_required_fields_without_echoing_secrets', async () => {
    // Re-import in isolation to avoid the cached env from leaking into this test
    const { getEnv, clearEnvCache } = await import('../src/lib/env');
    clearEnvCache();
    const originalEnv = { ...process.env };
    try {
      process.env = {
        WORKOS_API_KEY: 'sk_live_should_not_be_echoed',
        // Intentionally omit other required fields
      } as NodeJS.ProcessEnv;
      let thrown: unknown;
      try {
        getEnv();
      } catch (e) {
        thrown = e;
      }
      expect(thrown).toBeInstanceOf(Error);
      const msg = (thrown as Error).message;
      expect(msg).toContain('PAYLOAD_SECRET');
      expect(msg).toContain('WORKOS_CLIENT_ID');
      expect(msg).toContain('WORKOS_COOKIE_PASSWORD');
      expect(msg).toContain('PUBLIC_SITE_BASE_URL');
      expect(msg).not.toContain('sk_live_should_not_be_echoed');
    } finally {
      process.env = originalEnv;
      clearEnvCache();
    }
  });

  it('accepts_a_valid_environment', async () => {
    const { getEnv, clearEnvCache } = await import('../src/lib/env');
    clearEnvCache();
    const originalEnv = { ...process.env };
    try {
      process.env = {
        PAYLOAD_SECRET: 'a'.repeat(32),
        WORKOS_API_KEY: 'sk_test',
        WORKOS_CLIENT_ID: 'client_test',
        WORKOS_COOKIE_PASSWORD: 'b'.repeat(32),
        WORKOS_REDIRECT_URI: 'http://127.0.0.1:3000/auth/callback',
        PUBLIC_SITE_BASE_URL: 'https://example.com',
        ADMIN_BASE_URL: 'http://127.0.0.1:3000',
      } as NodeJS.ProcessEnv;
      const env = getEnv();
      expect(env.WORKOS_API_KEY).toBe('sk_test');
      expect(env.PUBLIC_SITE_BASE_URL).toBe('https://example.com');
      expect(env.ADMIN_BOOTSTRAP_EMAILS).toEqual([]);
    } finally {
      process.env = originalEnv;
      clearEnvCache();
    }
  });

  it('parses_bootstrap_emails_lowercased_and_trimmed', async () => {
    const { getEnv, clearEnvCache } = await import('../src/lib/env');
    clearEnvCache();
    const originalEnv = { ...process.env };
    try {
      process.env = {
        PAYLOAD_SECRET: 'a'.repeat(32),
        WORKOS_API_KEY: 'sk_test',
        WORKOS_CLIENT_ID: 'client_test',
        WORKOS_COOKIE_PASSWORD: 'b'.repeat(32),
        WORKOS_REDIRECT_URI: 'http://127.0.0.1:3000/auth/callback',
        PUBLIC_SITE_BASE_URL: 'https://example.com',
        ADMIN_BASE_URL: 'http://127.0.0.1:3000',
        ADMIN_BOOTSTRAP_EMAILS: ' Admin@PearTree.org , Michele@peartree.org ',
      } as NodeJS.ProcessEnv;
      const env = getEnv();
      expect(env.ADMIN_BOOTSTRAP_EMAILS).toEqual([
        'admin@peartree.org',
        'michele@peartree.org',
      ]);
    } finally {
      process.env = originalEnv;
      clearEnvCache();
    }
  });
});
