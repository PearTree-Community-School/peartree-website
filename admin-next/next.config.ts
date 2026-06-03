import { withPayload } from '@payloadcms/next/withPayload';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Allow better-sqlite3 (native binding) to load on the server.
  serverExternalPackages: ['better-sqlite3'],
};

export default withPayload(nextConfig);
