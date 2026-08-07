export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startMarketDataScheduler } = await import('./lib/marketData/scheduler');
    startMarketDataScheduler();
  }
}
