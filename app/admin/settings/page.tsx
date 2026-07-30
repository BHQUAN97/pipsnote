export default function AdminSettingsPage() {
  return (
    <div className="min-h-screen p-8 bg-bg">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Site Settings</h1>

        <div className="space-y-8">
          {/* Tab 1: Theme */}
          <section className="p-6 border rounded-lg">
            <h2 className="text-xl font-semibold mb-4">Theme Colors</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-2">Background (--bg)</label>
                <input type="color" className="w-full h-10" />
              </div>
              <div>
                <label className="block text-sm mb-2">Text (--ink)</label>
                <input type="color" className="w-full h-10" />
              </div>
              <div>
                <label className="block text-sm mb-2">Brand (--brand)</label>
                <input type="color" className="w-full h-10" />
              </div>
              <div>
                <label className="block text-sm mb-2">Up (--up)</label>
                <input type="color" className="w-full h-10" />
              </div>
            </div>
            <p className="mt-4 text-sm text-neutral">
              💡 Tip: Use preset buttons (Editorial Red / Fintech Blue / Crypto Neon)
            </p>
          </section>

          {/* Tab 2: Layout */}
          <section className="p-6 border rounded-lg">
            <h2 className="text-xl font-semibold mb-4">Layout Options</h2>
            <div className="space-y-3">
              <label className="flex items-center gap-2">
                <input type="checkbox" defaultChecked />
                <span>Sticky header</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" defaultChecked />
                <span>Show dark mode toggle</span>
              </label>
            </div>
          </section>

          <button className="px-6 py-2 bg-brand text-white rounded hover:bg-brand-dark">
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
