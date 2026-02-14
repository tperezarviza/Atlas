import * as cheerio from 'cheerio';
import { FETCH_TIMEOUT_API, TTL } from '../config.js';
import { cache } from '../cache.js';
import type { PollingData, PollEntry, PollingTrend } from '../types.js';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
};

function determineTrend(polls: PollEntry[]): PollingTrend {
  if (polls.length < 3) return 'stable';
  const recent = polls.slice(0, 3);
  const older = polls.slice(3, 6);
  if (older.length === 0) return 'stable';
  const recentAvg = recent.reduce((s, p) => s + p.approve, 0) / recent.length;
  const olderAvg = older.reduce((s, p) => s + p.approve, 0) / older.length;
  const diff = recentAvg - olderAvg;
  if (diff > 1.5) return 'improving';
  if (diff < -1.5) return 'declining';
  return 'stable';
}

async function scrapeApproval(): Promise<{
  rcp_average: { approve: number; disapprove: number; spread: number };
  recent_polls: PollEntry[];
  trend: PollingTrend;
} | null> {
  try {
    const res = await fetch('https://www.realclearpolling.com/polls/approval/donald-trump/approve-disapprove', {
      headers: HEADERS,
      signal: AbortSignal.timeout(FETCH_TIMEOUT_API),
    });
    if (!res.ok) return null;
    const html = await res.text();
    const $ = cheerio.load(html);

    const polls: PollEntry[] = [];
    let rcpApprove = 0;
    let rcpDisapprove = 0;

    // Look for RCP Average in the page — typically in a table or data element
    $('table tr, [class*="poll-row"], [class*="data-row"]').each((_, el) => {
      const cells = $(el).find('td, [class*="cell"]');
      if (cells.length < 3) return;
      const texts = cells.map((__, c) => $(c).text().trim()).get();
      const pollster = texts[0] || '';
      const dateStr = texts[1] || '';

      // Find numeric values
      const nums = texts.slice(2).map(t => parseFloat(t)).filter(n => !isNaN(n) && n > 0 && n < 100);
      if (nums.length < 2) return;

      if (/rcp|average/i.test(pollster)) {
        rcpApprove = nums[0];
        rcpDisapprove = nums[1];
        return;
      }

      if (pollster && dateStr && polls.length < 10) {
        polls.push({ pollster, date: dateStr, approve: nums[0], disapprove: nums[1] });
      }
    });

    // If no RCP average found, calculate from polls
    if (rcpApprove === 0 && polls.length > 0) {
      rcpApprove = Math.round(polls.reduce((s, p) => s + p.approve, 0) / polls.length * 10) / 10;
      rcpDisapprove = Math.round(polls.reduce((s, p) => s + p.disapprove, 0) / polls.length * 10) / 10;
    }

    if (rcpApprove === 0) return null;

    return {
      rcp_average: {
        approve: rcpApprove,
        disapprove: rcpDisapprove,
        spread: Math.round((rcpApprove - rcpDisapprove) * 10) / 10,
      },
      recent_polls: polls,
      trend: determineTrend(polls),
    };
  } catch {
    return null;
  }
}

async function scrapeGenericBallot(): Promise<{
  rcp_average: { republican: number; democrat: number; spread: number };
} | null> {
  try {
    const res = await fetch('https://www.realclearpolling.com/polls/other/2026-generic-congressional-vote', {
      headers: HEADERS,
      signal: AbortSignal.timeout(FETCH_TIMEOUT_API),
    });
    if (!res.ok) return null;
    const html = await res.text();
    const $ = cheerio.load(html);

    let repAvg = 0;
    let demAvg = 0;

    $('table tr, [class*="poll-row"]').each((_, el) => {
      const cells = $(el).find('td, [class*="cell"]');
      const texts = cells.map((__, c) => $(c).text().trim()).get();
      if (/rcp|average/i.test(texts[0] || '')) {
        const nums = texts.slice(1).map(t => parseFloat(t)).filter(n => !isNaN(n) && n > 0 && n < 100);
        if (nums.length >= 2) {
          repAvg = nums[0];
          demAvg = nums[1];
        }
      }
    });

    if (repAvg === 0) return null;
    return {
      rcp_average: {
        republican: repAvg,
        democrat: demAvg,
        spread: Math.round((repAvg - demAvg) * 10) / 10,
      },
    };
  } catch {
    return null;
  }
}

async function scrapeDirection(): Promise<{
  right_direction: number;
  wrong_track: number;
} | null> {
  try {
    const res = await fetch('https://www.realclearpolling.com/polls/other/direction_of_country', {
      headers: HEADERS,
      signal: AbortSignal.timeout(FETCH_TIMEOUT_API),
    });
    if (!res.ok) return null;
    const html = await res.text();
    const $ = cheerio.load(html);

    let rightDir = 0;
    let wrongTrack = 0;

    $('table tr, [class*="poll-row"]').each((_, el) => {
      const cells = $(el).find('td, [class*="cell"]');
      const texts = cells.map((__, c) => $(c).text().trim()).get();
      if (/rcp|average/i.test(texts[0] || '')) {
        const nums = texts.slice(1).map(t => parseFloat(t)).filter(n => !isNaN(n) && n > 0 && n < 100);
        if (nums.length >= 2) {
          rightDir = nums[0];
          wrongTrack = nums[1];
        }
      }
    });

    if (rightDir === 0) return null;
    return { right_direction: rightDir, wrong_track: wrongTrack };
  } catch {
    return null;
  }
}

export async function fetchPolling(): Promise<void> {
  if (cache.isFresh('polling')) return;
  console.log('[POLLING] Scraping polling data...');

  try {
    const [approval, ballot, direction] = await Promise.allSettled([
      scrapeApproval(),
      scrapeGenericBallot(),
      scrapeDirection(),
    ]);

    const approvalData = approval.status === 'fulfilled' ? approval.value : null;
    const ballotData = ballot.status === 'fulfilled' ? ballot.value : null;
    const directionData = direction.status === 'fulfilled' ? direction.value : null;

    const polling: PollingData = {
      presidential_approval: approvalData ?? {
        rcp_average: { approve: 0, disapprove: 0, spread: 0 },
        recent_polls: [],
        trend: 'stable',
      },
      generic_ballot: ballotData ?? {
        rcp_average: { republican: 0, democrat: 0, spread: 0 },
      },
      direction: directionData ?? {
        right_direction: 0,
        wrong_track: 0,
      },
    };

    const hasData = approvalData || ballotData || directionData;
    if (hasData) {
      cache.set('polling', polling, TTL.POLLING);
      console.log(`[POLLING] Cached — approval: ${polling.presidential_approval.rcp_average.approve}%`);
    } else {
      console.warn('[POLLING] No data scraped from any source, using mock');
    }
  } catch (err) {
    console.error('[POLLING] Fetch failed:', err instanceof Error ? err.message : err);
  }
}
