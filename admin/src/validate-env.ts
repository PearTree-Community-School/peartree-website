import { parseAdminEnv } from './config.js';

const result = parseAdminEnv(process.env);

if (!result.ok) {
  console.error(result.message);
  process.exit(1);
}

process.stdout.write(`Admin environment valid for ${result.env.ADMIN_BASE_URL}\n`);
