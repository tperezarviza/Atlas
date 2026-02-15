import { BigQuery } from '@google-cloud/bigquery';
import { GCP_PROJECT_ID } from '../config.js';

let client: BigQuery | null = null;

export function initBigQuery(): void {
  if (!GCP_PROJECT_ID) {
    console.warn('[BQ] No GCP_PROJECT_ID set, BigQuery disabled');
    return;
  }
  try {
    client = new BigQuery({ projectId: GCP_PROJECT_ID });
    console.log('[BQ] BigQuery client initialized');
  } catch (err) {
    console.error('[BQ] Init failed:', err instanceof Error ? err.message : err);
  }
}

export function isBigQueryAvailable(): boolean {
  return client !== null;
}

/**
 * Run a BigQuery query and return rows.
 * Always use parameterized queries to prevent injection.
 */
export async function bqQuery<T = Record<string, unknown>>(
  sql: string,
  params?: Record<string, unknown>,
): Promise<T[]> {
  if (!client) throw new Error('BigQuery not initialized');

  const options: any = {
    query: sql,
    location: 'US', // GDELT is in US multi-region
  };
  if (params) {
    options.params = params;
    options.parameterMode = 'NAMED';
  }

  const [rows] = await client.query(options);
  return rows as T[];
}

/**
 * Estimate bytes processed by a query (dry run).
 * Use to monitor costs.
 */
export async function bqDryRun(sql: string, params?: Record<string, unknown>): Promise<number> {
  if (!client) throw new Error('BigQuery not initialized');
  const [job] = await client.createQueryJob({
    query: sql,
    location: 'US',
    dryRun: true,
    params,
    parameterMode: params ? 'NAMED' : undefined,
  });
  return Number(job.metadata?.statistics?.totalBytesProcessed ?? 0);
}
