export default function Home() {
  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-4">PIPSNOTE</h1>
        <p className="text-lg" style={{ color: 'var(--neutral)' }}>
          Forex & Crypto Trading Insights — Coming Soon
        </p>
        <div className="mt-8 p-6 border rounded-lg">
          <h2 className="text-2xl font-semibold mb-2">Features:</h2>
          <ul className="list-disc list-inside space-y-2">
            <li>Market Analysis & News</li>
            <li>Broker Reviews & Comparisons</li>
            <li>Trading Strategies & Education</li>
            <li>Real-time Market Data</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
