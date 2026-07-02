import { spawn } from 'node:child_process';

export type SiteBuildStatus = {
  readonly state: 'idle' | 'building';
  readonly queued: boolean;
  readonly lastResult: 'success' | 'failure' | null;
  readonly lastFinishedAt: Date | null;
  readonly lastError: string | null;
};

export type SiteBuilder = {
  /** Request a rebuild. Coalesces: one build runs at a time, at most one queued. */
  readonly requestBuild: () => void;
  readonly status: () => SiteBuildStatus;
};

export type SiteBuilderOptions = {
  readonly siteDir: string;
  readonly adminApiUrl: string;
  /** Injectable for tests. Defaults to spawning `npx astro build`. */
  readonly runBuild?: (siteDir: string, adminApiUrl: string) => Promise<void>;
  readonly log?: (message: string) => void;
};

function defaultRunBuild(siteDir: string, adminApiUrl: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn('npx', ['astro', 'build'], {
      cwd: siteDir,
      env: {
        ...process.env,
        SITE_SELF_HOSTED: '1',
        SITE_URL: adminApiUrl,
        ADMIN_API_URL: adminApiUrl,
      },
      stdio: ['ignore', 'ignore', 'pipe'],
    });
    let stderr = '';
    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`astro build exited ${code}: ${stderr.slice(-500)}`));
    });
  });
}

export function createSiteBuilder(options: SiteBuilderOptions): SiteBuilder {
  const runBuild = options.runBuild ?? defaultRunBuild;
  const log = options.log ?? (() => {});
  let state: 'idle' | 'building' = 'idle';
  let queued = false;
  let lastResult: 'success' | 'failure' | null = null;
  let lastFinishedAt: Date | null = null;
  let lastError: string | null = null;

  const runLoop = async (): Promise<void> => {
    state = 'building';
    do {
      queued = false;
      log('Site rebuild started');
      try {
        await runBuild(options.siteDir, options.adminApiUrl);
        lastResult = 'success';
        lastError = null;
        log('Site rebuild finished');
      } catch (err) {
        lastResult = 'failure';
        lastError = err instanceof Error ? err.message : String(err);
        log(`Site rebuild failed: ${lastError}`);
      }
      lastFinishedAt = new Date();
    } while (queued);
    state = 'idle';
  };

  return {
    requestBuild() {
      if (state === 'building') {
        queued = true;
        return;
      }
      void runLoop();
    },
    status() {
      return { state, queued, lastResult, lastFinishedAt, lastError };
    },
  };
}
