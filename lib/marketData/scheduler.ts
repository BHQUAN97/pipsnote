import { createRequestLogger } from '@/lib/logger';
import { getSiteSettings } from '@/lib/settings';
import { refreshMarketData } from './refresh';

const log = createRequestLogger('market-data-scheduler');

let started = false;
let timer: NodeJS.Timeout | null = null;

function minutesToMs(min: number): number {
  const n = Number.isFinite(min) ? min : 15;
  const clamped = Math.min(1440, Math.max(1, n)); // 1 phút .. 24h
  return clamped * 60 * 1000;
}

async function readIntervalMinutes(): Promise<number> {
  try {
    const settings = await getSiteSettings();
    const v = parseInt(settings['market.refresh_interval_minutes'] ?? '', 10);
    if (Number.isInteger(v) && v >= 1 && v <= 1440) return v;
  } catch {
    // fall-through — settings lỗi tạm dùng mặc định, không nên làm vỡ scheduler
  }
  return 15;
}

async function run(): Promise<void> {
  const interval = await readIntervalMinutes();
  const delay = minutesToMs(interval);

  timer = setTimeout(() => {
    void run();
  }, delay);

  try {
    const result = await refreshMarketData();
    log.info(
      { succeeded: result.succeeded.length, failed: result.failed, nextIntervalMin: interval },
      'market data refreshed'
    );
  } catch (err) {
    log.error({ err }, 'market data refresh failed');
  }
}

export function startMarketDataScheduler(): void {
  if (started) return;
  started = true;
  void run();
}

export function stopMarketDataScheduler(): void {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  started = false;
}