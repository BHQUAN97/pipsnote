import cron from 'node-cron';
import { createRequestLogger } from '@/lib/logger';
import { refreshMarketData } from './refresh';

const log = createRequestLogger('market-data-scheduler');

let started = false;

export function startMarketDataScheduler(): void {
  if (started) return;
  started = true;

  const run = async () => {
    try {
      const result = await refreshMarketData();
      log.info({ succeeded: result.succeeded.length, failed: result.failed }, 'market data refreshed');
    } catch (err) {
      log.error({ err }, 'market data refresh failed');
    }
  };

  cron.schedule('*/15 * * * *', run, { timezone: 'UTC' });
  log.info('market data scheduler registered (*/15 * * * * UTC)');

  void run();
}
