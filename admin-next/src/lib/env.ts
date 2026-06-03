import { z } from 'zod';

const schema = z.object({
  PAYLOAD_SECRET: z.string().trim().min(32),
  DATABASE_URI: z.string().trim().min(1).default('file:./data/admin.sqlite'),
  WORKOS_API_KEY: z.string().trim().min(1),
  WORKOS_CLIENT_ID: z.string().trim().min(1),
  WORKOS_COOKIE_PASSWORD: z.string().trim().min(32),
  WORKOS_REDIRECT_URI: z.string().trim().url(),
  WORKOS_ORGANIZATION_ID: z.string().trim().min(1).optional(),
  WORKOS_WEBHOOK_SECRET: z.string().trim().min(1).optional(),
  ADMIN_BOOTSTRAP_EMAILS: z.string().trim().optional(),
  PUBLIC_SITE_BASE_URL: z.string().trim().url(),
  ADMIN_BASE_URL: z.string().trim().url(),
});

export type AdminEnv = {
  readonly PAYLOAD_SECRET: string;
  readonly DATABASE_URI: string;
  readonly WORKOS_API_KEY: string;
  readonly WORKOS_CLIENT_ID: string;
  readonly WORKOS_COOKIE_PASSWORD: string;
  readonly WORKOS_REDIRECT_URI: string;
  readonly WORKOS_ORGANIZATION_ID: string | undefined;
  readonly WORKOS_WEBHOOK_SECRET: string | undefined;
  readonly ADMIN_BOOTSTRAP_EMAILS: readonly string[];
  readonly PUBLIC_SITE_BASE_URL: string;
  readonly ADMIN_BASE_URL: string;
};

function parseBootstrapEmails(raw: string | undefined): readonly string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((v) => v.trim().toLowerCase())
    .filter((v) => v.length > 0);
}

let cached: AdminEnv | undefined;

export function getEnv(): AdminEnv {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const fields = ['PAYLOAD_SECRET', 'WORKOS_API_KEY', 'WORKOS_CLIENT_ID', 'WORKOS_COOKIE_PASSWORD', 'WORKOS_REDIRECT_URI', 'PUBLIC_SITE_BASE_URL', 'ADMIN_BASE_URL'];
    throw new Error(`Invalid admin environment. Check: ${fields.join(', ')}`);
  }
  cached = {
    PAYLOAD_SECRET: parsed.data.PAYLOAD_SECRET,
    DATABASE_URI: parsed.data.DATABASE_URI,
    WORKOS_API_KEY: parsed.data.WORKOS_API_KEY,
    WORKOS_CLIENT_ID: parsed.data.WORKOS_CLIENT_ID,
    WORKOS_COOKIE_PASSWORD: parsed.data.WORKOS_COOKIE_PASSWORD,
    WORKOS_REDIRECT_URI: parsed.data.WORKOS_REDIRECT_URI,
    WORKOS_ORGANIZATION_ID: parsed.data.WORKOS_ORGANIZATION_ID,
    WORKOS_WEBHOOK_SECRET: parsed.data.WORKOS_WEBHOOK_SECRET,
    ADMIN_BOOTSTRAP_EMAILS: parseBootstrapEmails(parsed.data.ADMIN_BOOTSTRAP_EMAILS),
    PUBLIC_SITE_BASE_URL: parsed.data.PUBLIC_SITE_BASE_URL,
    ADMIN_BASE_URL: parsed.data.ADMIN_BASE_URL,
  };
  return cached;
}

// Re-export for tests
export function clearEnvCache(): void {
  cached = undefined;
}
