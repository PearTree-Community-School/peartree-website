import { z } from 'zod';
import { parseBootstrapEmails } from './session.js';

const missingOrEmptyMessage = 'Required admin setting is missing';

const envSchema = z.object({
  WORKOS_API_KEY: z.string().trim().min(1, missingOrEmptyMessage),
  WORKOS_CLIENT_ID: z.string().trim().min(1, missingOrEmptyMessage),
  WORKOS_COOKIE_PASSWORD: z.string().trim().min(32, 'Must be at least 32 characters'),
  ADMIN_BASE_URL: z.string().trim().url('Must be a valid URL'),
  PUBLIC_SITE_BASE_URL: z.string().trim().url('Must be a valid URL'),
  WORKOS_REDIRECT_URI: z.string().trim().url('Must be a valid URL'),
  WORKOS_ORGANIZATION_ID: z.string().trim().min(1).optional(),
  ADMIN_BOOTSTRAP_EMAILS: z.string().trim().optional(),
  ADMIN_DB_PATH: z.string().trim().min(1).default('./data/admin.sqlite'),
  WORKOS_WEBHOOK_SECRET: z.string().trim().min(1).optional(),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
});

export type AdminEnv = {
  readonly WORKOS_API_KEY: string;
  readonly WORKOS_CLIENT_ID: string;
  readonly WORKOS_COOKIE_PASSWORD: string;
  readonly ADMIN_BASE_URL: string;
  readonly PUBLIC_SITE_BASE_URL: string;
  readonly WORKOS_REDIRECT_URI: string;
  readonly WORKOS_ORGANIZATION_ID: string | undefined;
  readonly ADMIN_BOOTSTRAP_EMAILS: readonly string[];
  readonly ADMIN_DB_PATH: string;
  readonly WORKOS_WEBHOOK_SECRET: string | undefined;
  readonly PORT: number;
};

export type EnvParseResult =
  | { readonly ok: true; readonly env: AdminEnv }
  | { readonly ok: false; readonly message: string; readonly fields: readonly string[] };

const requiredFieldNames = [
  'WORKOS_API_KEY',
  'WORKOS_CLIENT_ID',
  'WORKOS_COOKIE_PASSWORD',
  'ADMIN_BASE_URL',
  'PUBLIC_SITE_BASE_URL',
  'WORKOS_REDIRECT_URI',
] as const;

export function parseAdminEnv(input: NodeJS.ProcessEnv): EnvParseResult {
  const parsed = envSchema.safeParse(input);
  if (parsed.success) {
    const env: AdminEnv = {
      WORKOS_API_KEY: parsed.data.WORKOS_API_KEY,
      WORKOS_CLIENT_ID: parsed.data.WORKOS_CLIENT_ID,
      WORKOS_COOKIE_PASSWORD: parsed.data.WORKOS_COOKIE_PASSWORD,
      ADMIN_BASE_URL: parsed.data.ADMIN_BASE_URL,
      PUBLIC_SITE_BASE_URL: parsed.data.PUBLIC_SITE_BASE_URL,
      WORKOS_REDIRECT_URI: parsed.data.WORKOS_REDIRECT_URI,
      WORKOS_ORGANIZATION_ID: parsed.data.WORKOS_ORGANIZATION_ID,
      ADMIN_BOOTSTRAP_EMAILS: parseBootstrapEmails(parsed.data.ADMIN_BOOTSTRAP_EMAILS),
      ADMIN_DB_PATH: parsed.data.ADMIN_DB_PATH,
      WORKOS_WEBHOOK_SECRET: parsed.data.WORKOS_WEBHOOK_SECRET,
      PORT: parsed.data.PORT,
    };
    return { ok: true, env };
  }

  return {
    ok: false,
    fields: requiredFieldNames,
    message: `Invalid admin environment. Check: ${requiredFieldNames.join(', ')}`,
  };
}

export function requireAdminEnv(input: NodeJS.ProcessEnv): AdminEnv {
  const result = parseAdminEnv(input);
  if (result.ok) {
    return result.env;
  }

  throw new AdminEnvError(result.message, result.fields);
}

export class AdminEnvError extends Error {
  readonly fields: readonly string[];

  constructor(message: string, fields: readonly string[]) {
    super(message);
    this.name = 'AdminEnvError';
    this.fields = fields;
  }
}
